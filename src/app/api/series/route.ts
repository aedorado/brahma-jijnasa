import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_64_PRINCIPLES_SERIES } from '@/lib/series-data'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: seriesList, error } = await supabase
      .from('quiz_series')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error || !seriesList || seriesList.length === 0) {
      // Graceful fallback to default series if table is not yet migrated in Supabase
      return NextResponse.json([DEFAULT_64_PRINCIPLES_SERIES], {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      })
    }

    return NextResponse.json(seriesList, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (err: any) {
    console.warn('[Series API Fallback]:', err?.message)
    return NextResponse.json([DEFAULT_64_PRINCIPLES_SERIES])
  }
}
