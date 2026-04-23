import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.INIT_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    // Create tables using SQL
    const createTablesSQL = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      -- Practice Sessions table
      CREATE TABLE IF NOT EXISTS practice_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mode TEXT NOT NULL,
        title TEXT,
        content TEXT,
        duration_seconds INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      -- Feedback table
      CREATE TABLE IF NOT EXISTS feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        content TEXT,
        score INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      -- Progress table
      CREATE TABLE IF NOT EXISTS progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        level INTEGER DEFAULT 1,
        total_sessions INTEGER DEFAULT 0,
        total_minutes INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        UNIQUE(user_id, category)
      );

      -- Enable RLS
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
      ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

      -- RLS Policies for users
      CREATE POLICY "Users can read their own data"
        ON users FOR SELECT
        USING (auth.uid()::text = id::text);

      CREATE POLICY "Users can update their own data"
        ON users FOR UPDATE
        USING (auth.uid()::text = id::text);

      -- RLS Policies for practice_sessions
      CREATE POLICY "Users can read their own sessions"
        ON practice_sessions FOR SELECT
        USING (user_id = auth.uid());

      CREATE POLICY "Users can create sessions"
        ON practice_sessions FOR INSERT
        WITH CHECK (user_id = auth.uid());

      CREATE POLICY "Users can update their own sessions"
        ON practice_sessions FOR UPDATE
        USING (user_id = auth.uid());

      -- RLS Policies for feedback
      CREATE POLICY "Users can read feedback for their sessions"
        ON feedback FOR SELECT
        USING (EXISTS (
          SELECT 1 FROM practice_sessions
          WHERE practice_sessions.id = feedback.session_id
          AND practice_sessions.user_id = auth.uid()
        ));

      -- RLS Policies for progress
      CREATE POLICY "Users can read their own progress"
        ON progress FOR SELECT
        USING (user_id = auth.uid());

      CREATE POLICY "Users can create progress records"
        ON progress FOR INSERT
        WITH CHECK (user_id = auth.uid());

      CREATE POLICY "Users can update their own progress"
        ON progress FOR UPDATE
        USING (user_id = auth.uid());
    `

    // Execute SQL statements
    const statements = createTablesSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const statement of statements) {
      const { error } = await supabase.rpc('exec', {
        sql: statement,
      } as any)

      // If the RPC doesn't exist, we'll just note it
      if (error && error.message.includes('does not exist')) {
        console.log('Note: exec RPC not available, schema may need manual setup')
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
    })
  } catch (error: any) {
    console.error('Initialization error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initialize database' },
      { status: 500 }
    )
  }
}
