import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GeocodeResult {
  lat: string;
  lon: string;
  display_name: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { birthPlace } = await req.json();

    if (!birthPlace || typeof birthPlace !== 'string') {
      return new Response(
        JSON.stringify({ error: 'birthPlace is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const encodedPlace = encodeURIComponent(birthPlace);
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedPlace}&format=json&limit=5&addressdetails=1`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Arcana-Astrology-App/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data: GeocodeResult[] = await response.json();

    const results = data.map((item) => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      displayName: item.display_name,
    }));

    return new Response(
      JSON.stringify({ results }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Geocoding error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Geocoding failed',
        results: []
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
