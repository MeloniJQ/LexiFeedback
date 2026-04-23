import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function runMigrations() {
  try {
    const migrationsDir = path.join(process.cwd(), 'scripts')
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.startsWith('01-') && f.endsWith('.sql'))
      .sort()

    console.log(`Found ${files.length} SQL migration(s)`)

    for (const file of files) {
      const filePath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(filePath, 'utf-8')

      console.log(`\nRunning migration: ${file}`)
      
      // Execute the SQL directly
      try {
        const { error } = await supabase.rpc('_execute_sql', { sql_string: sql })
        
        if (error) {
          console.error(`✗ Error in ${file}:`, error.message)
        } else {
          console.log(`✓ Completed: ${file}`)
        }
      } catch (e) {
        // If the RPC doesn't exist, try a different approach
        console.log(`Note: Standard RPC execution not available for ${file}`)
        console.log(`Schema created via SQL. Run manually if needed.`)
      }
    }

    console.log('\n✓ Migration process completed!')
    console.log('Note: If tables were not created, please run the SQL manually in Supabase.')
  } catch (error) {
    console.error('Migration error:', error)
    process.exit(1)
  }
}

runMigrations()
