import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { migrationFile } = await request.json();
    
    if (!migrationFile) {
      return NextResponse.json({ error: "Missing migrationFile parameter" }, { status: 400 });
    }

    console.log(`🚀 Running migration: ${migrationFile}`);
    
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({ error: `Migration file not found: ${migrationFile}` }, { status: 404 });
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const supabase = createServiceClient();
    
    // Split SQL into individual statements and execute them
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== '');
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    const results = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`   Executing statement ${i + 1}/${statements.length}`);
        console.log(`   SQL: ${statement.substring(0, 100)}...`);
        
        // Use the from() method with a raw SQL query
        const { data, error } = await supabase.rpc('exec_sql', { query: statement });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
          results.push({
            statementIndex: i + 1,
            success: false,
            error: error.message,
            sql: statement.substring(0, 200)
          });
          
          // Continue with other statements even if one fails
          continue;
        }
        
        results.push({
          statementIndex: i + 1,
          success: true,
          sql: statement.substring(0, 200)
        });
        
      } catch (err) {
        console.error(`💥 Exception in statement ${i + 1}:`, err);
        results.push({
          statementIndex: i + 1,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
          sql: statement.substring(0, 200)
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`✅ Migration completed: ${successCount}/${totalCount} statements succeeded`);
    
    return NextResponse.json({
      success: successCount === totalCount,
      migrationFile,
      totalStatements: totalCount,
      successfulStatements: successCount,
      results
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
