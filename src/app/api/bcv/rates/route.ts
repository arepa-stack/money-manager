import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import https from 'https';
import { randomUUID } from 'crypto';

// Format date to "Lunes, 01 Junio 2026"
function formatDateForDisplay(d: Date): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Scraper helper for BCV (Alternative B)
function fetchBcvHtml(): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.bcv.org.ve',
      port: 443,
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      },
      rejectUnauthorized: false
    };

    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to load BCV page, status: ${res.statusCode}`));
          return;
        }
        resolve(data);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Request to BCV timed out'));
    });
  });
}

export async function GET(request: NextRequest) {
  try {
    // 1. Ensure exchange_rates table exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS exchange_rates (
        id TEXT PRIMARY KEY,
        rate_date TEXT NOT NULL,
        fetched_at INTEGER NOT NULL,
        usd_oficial REAL NOT NULL,
        usd_paralelo REAL,
        eur_oficial REAL NOT NULL,
        eur_paralelo REAL,
        source TEXT NOT NULL
      );
    `);

    // 2. Query params
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // 3. Query existing history
    const latestRates: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM exchange_rates ORDER BY fetched_at DESC LIMIT 2;
    `);

    const now = Date.now();
    let shouldFetch = force || latestRates.length === 0;

    if (!shouldFetch && latestRates.length > 0) {
      const lastFetched = Number(latestRates[0].fetched_at);
      const cacheAge = now - lastFetched;
      const cacheLimit = 1 * 60 * 60 * 1000; // 1 hour
      if (cacheAge > cacheLimit) {
        shouldFetch = true;
      }
    }

    if (shouldFetch) {
      let usdOficial = 0;
      let usdParalelo = 0;
      let eurOficial = 0;
      let eurParalelo = 0;
      let rateDate = '';
      let source = 'dolarapi';

      try {
        // Attempt fetching from DolarAPI
        const [usdOficialRes, usdParaleloRes, eurOficialRes, eurParaleloRes] = await Promise.all([
          fetch('https://ve.dolarapi.com/v1/dolares/oficial').then(r => {
            if (!r.ok) throw new Error('USD Oficial error');
            return r.json();
          }),
          fetch('https://ve.dolarapi.com/v1/dolares/paralelo').then(r => {
            if (!r.ok) throw new Error('USD Paralelo error');
            return r.json();
          }),
          fetch('https://ve.dolarapi.com/v1/euros/oficial').then(r => {
            if (!r.ok) throw new Error('EUR Oficial error');
            return r.json();
          }),
          fetch('https://ve.dolarapi.com/v1/euros/paralelo').then(r => {
            if (!r.ok) throw new Error('EUR Paralelo error');
            return r.json();
          })
        ]);

        usdOficial = usdOficialRes.promedio;
        usdParalelo = usdParaleloRes.promedio;
        eurOficial = eurOficialRes.promedio;
        eurParalelo = eurParaleloRes.promedio;

        const apiDate = new Date(usdOficialRes.fechaActualizacion || new Date());
        rateDate = formatDateForDisplay(apiDate);
      } catch (apiErr: any) {
        console.error('Error fetching from DolarAPI, falling back to BCV Scraping (Alternative B):', apiErr);

        // Fallback: Scrape BCV (Alternative B)
        try {
          const html = await fetchBcvHtml();

          // Date
          const dateSpanRegex = /<span class="date-display-single"[^>]*property="dc:date"[^>]*content="([^"]+)"[^>]*>([\s\S]*?)<\/span>/i;
          const dateMatch = html.match(dateSpanRegex);
          const isoDate = dateMatch ? dateMatch[1] : '';
          const formattedDate = dateMatch ? dateMatch[2].trim().replace(/\s+/g, ' ') : '';
          rateDate = formattedDate || isoDate || formatDateForDisplay(new Date());

          // USD Oficial
          const usdRegex = /id="dolar"[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i;
          const usdMatch = html.match(usdRegex);
          const usdRaw = usdMatch ? usdMatch[1].trim() : '';
          usdOficial = usdRaw ? parseFloat(usdRaw.replace(/\./g, '').replace(',', '.')) : 0;

          // EUR Oficial
          const eurRegex = /id="euro"[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i;
          const eurMatch = html.match(eurRegex);
          const eurRaw = eurMatch ? eurMatch[1].trim() : '';
          eurOficial = eurRaw ? parseFloat(eurRaw.replace(/\./g, '').replace(',', '.')) : 0;

          if (!usdOficial || !eurOficial) {
            throw new Error('Fallback BCV parsing failed to extract values');
          }

          // Recover last known parallel rates from DB
          const lastRate = latestRates[0];
          usdParalelo = lastRate ? lastRate.usd_paralelo : 0;
          eurParalelo = lastRate ? lastRate.eur_paralelo : 0;
          source = 'bcv_fallback';

        } catch (bcvErr: any) {
          console.error('Fallback BCV Scraping also failed:', bcvErr);
          // If fallback fails but we have cached rates, load from cache, otherwise throw error
          if (latestRates.length === 0) {
            throw new Error(`DolarAPI down (${apiErr.message}) and Fallback BCV Scraping also failed (${bcvErr.message})`);
          }
          // Reset fetching trigger to avoid locking UI
          shouldFetch = false;
        }
      }

      // If we fetched new rates successfully, store them
      if (shouldFetch && usdOficial > 0 && eurOficial > 0) {
        const lastRate = latestRates[0];

        if (!lastRate) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO exchange_rates (id, rate_date, fetched_at, usd_oficial, usd_paralelo, eur_oficial, eur_paralelo, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            randomUUID(),
            rateDate,
            now,
            usdOficial,
            usdParalelo,
            eurOficial,
            eurParalelo,
            source
          );
        } else if (
          lastRate.usd_oficial !== usdOficial ||
          lastRate.usd_paralelo !== usdParalelo ||
          lastRate.eur_oficial !== eurOficial ||
          lastRate.eur_paralelo !== eurParalelo
        ) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO exchange_rates (id, rate_date, fetched_at, usd_oficial, usd_paralelo, eur_oficial, eur_paralelo, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            randomUUID(),
            rateDate,
            now,
            usdOficial,
            usdParalelo,
            eurOficial,
            eurParalelo,
            source
          );
        } else {
          // Update last fetched timestamp and source to extend cache
          await prisma.$executeRawUnsafe(
            `UPDATE exchange_rates SET fetched_at = ?, source = ? WHERE id = ?`,
            now,
            source,
            lastRate.id
          );
        }
      }
    }

    // 4. Retrieve complete history
    const allHistory: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM exchange_rates ORDER BY fetched_at DESC LIMIT 15;
    `);

    if (allHistory.length === 0) {
      return NextResponse.json({ error: 'No hay tasas registradas en la base de datos' }, { status: 404 });
    }

    const current = allHistory[0];

    // Find the last record with different rates for accurate variation calculation
    const previous = allHistory.find(r => 
      r.usd_oficial !== current.usd_oficial || 
      r.usd_paralelo !== current.usd_paralelo ||
      r.eur_oficial !== current.eur_oficial ||
      r.eur_paralelo !== current.eur_paralelo
    ) || allHistory[1];

    let usdOficialVar = 0;
    let usdParaleloVar = 0;
    let eurOficialVar = 0;
    let eurParaleloVar = 0;

    if (previous) {
      if (previous.usd_oficial > 0) usdOficialVar = ((current.usd_oficial - previous.usd_oficial) / previous.usd_oficial) * 100;
      if (previous.usd_paralelo > 0) usdParaleloVar = ((current.usd_paralelo - previous.usd_paralelo) / previous.usd_paralelo) * 100;
      if (previous.eur_oficial > 0) eurOficialVar = ((current.eur_oficial - previous.eur_oficial) / previous.eur_oficial) * 100;
      if (previous.eur_paralelo > 0) eurParaleloVar = ((current.eur_paralelo - previous.eur_paralelo) / previous.eur_paralelo) * 100;
    }

    return NextResponse.json({
      usdOficial: current.usd_oficial,
      usdParalelo: current.usd_paralelo,
      eurOficial: current.eur_oficial,
      eurParalelo: current.eur_paralelo,
      date: current.rate_date,
      fetchedAt: Number(current.fetched_at),
      source: current.source,
      usdOficialVar,
      usdParaleloVar,
      eurOficialVar,
      eurParaleloVar,
      history: allHistory.map(r => ({
        id: r.id,
        date: r.rate_date,
        fetchedAt: Number(r.fetched_at),
        usdOficial: r.usd_oficial,
        usdParalelo: r.usd_paralelo,
        eurOficial: r.eur_oficial,
        eurParalelo: r.eur_paralelo,
        source: r.source
      }))
    });

  } catch (error: any) {
    console.error('Error in exchange rates API:', error);
    return NextResponse.json({ error: error.message || 'Error interno al consultar las tasas' }, { status: 500 });
  }
}
