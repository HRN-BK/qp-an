import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST() {
  try {
    const supabase = createServiceClient();

    // First check if columns already exist
    const { data: columnCheck, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'vocabularies')
      .in('column_name', ['synonyms', 'antonyms', 'collocations']);

    if (checkError) {
      console.log('Column check error (this is usually fine):', checkError);
    }

    const existingColumns = columnCheck?.map(col => col.column_name) || [];
    
    // For now, just return success since we can't run DDL directly
    // The columns will need to be added manually via Supabase dashboard
    return NextResponse.json({ 
      message: "Migration status checked",
      existing_columns: existingColumns,
      needed_columns: ['synonyms', 'antonyms', 'collocations'],
      note: "Please add the missing columns manually via Supabase dashboard SQL editor if they don't exist"
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: "Migration check failed" }, { status: 500 });
  }
}
