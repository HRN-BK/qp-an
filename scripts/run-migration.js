#!/usr/bin/env node

/**
 * Migration runner script for staging and production environments
 * 
 * Usage:
 *   node scripts/run-migration.js --env=staging
 *   node scripts/run-migration.js --env=production --confirm
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const env = process.argv.find(arg => arg.startsWith('--env='))?.split('=')[1];
const confirmed = process.argv.includes('--confirm');

if (!env) {
  console.error('Error: --env argument is required (staging or production)');
  process.exit(1);
}

if (env === 'production' && !confirmed) {
  console.error('Error: Production migrations require --confirm flag');
  process.exit(1);
}

const config = {
  staging: {
    url: process.env.STAGING_SUPABASE_URL,
    key: process.env.STAGING_SUPABASE_ANON_KEY,
  },
  production: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
};

if (!config[env]?.url || !config[env]?.key) {
  console.error(`Error: Missing Supabase configuration for ${env} environment`);
  process.exit(1);
}

const supabase = createClient(config[env].url, config[env].key);

async function runSQL(filePath) {
  try {
    console.log(`Running: ${path.basename(filePath)}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`Error in ${filePath}:`, error);
      return false;
    }
    
    console.log(`✓ Completed: ${path.basename(filePath)}`);
    return true;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return false;
  }
}

async function runMigration() {
  console.log(`🚀 Running migration on ${env} environment`);
  
  const migrationFiles = [
    'migrations/004_add_study_tracking_schema.sql',
    'migrations/005_vocabulary_mastery_level_backfill.sql'
  ];
  
  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, '..', file);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Migration file not found: ${file}`);
      continue;
    }
    
    const success = await runSQL(filePath);
    if (!success) {
      console.error(`❌ Migration failed at: ${file}`);
      process.exit(1);
    }
  }
  
  console.log('✅ Migration completed successfully!');
  
  // Run verification
  console.log('\n🔍 Running verification...');
  const verificationPath = path.join(__dirname, 'verify-migration.sql');
  
  if (fs.existsSync(verificationPath)) {
    await runSQL(verificationPath);
  }
  
  console.log('\n🎉 Migration and verification completed!');
}

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

runMigration().catch(console.error);
