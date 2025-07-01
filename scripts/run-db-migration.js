#!/usr/bin/env node

/**
 * Run database migration using Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(migrationFile) {
  try {
    console.log(`🚀 Running migration: ${migrationFile}`);
    
    const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      return false;
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'))
      .map(stmt => stmt + ';');
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim() === ';') continue;
      
      console.log(`   Executing statement ${i + 1}/${statements.length}`);
      
      const { data, error } = await supabase.rpc('exec', {
        sql: statement
      });
      
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error);
        console.error(`SQL: ${statement}`);
        return false;
      }
    }
    
    console.log(`✅ Migration completed successfully: ${migrationFile}`);
    return true;
    
  } catch (err) {
    console.error(`❌ Error running migration ${migrationFile}:`, err);
    return false;
  }
}

async function main() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('Usage: node scripts/run-db-migration.js <migration-file>');
    console.error('Example: node scripts/run-db-migration.js 006_sync_vocabulary_schema.sql');
    process.exit(1);
  }
  
  console.log('🔧 Starting database migration...');
  
  const success = await runMigration(migrationFile);
  
  if (success) {
    console.log('🎉 Migration completed successfully!');
  } else {
    console.log('💥 Migration failed!');
    process.exit(1);
  }
}

main().catch(console.error);
