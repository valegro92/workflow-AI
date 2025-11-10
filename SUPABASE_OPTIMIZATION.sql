-- ===================================
-- Workflow AI - Database Optimization
-- Additional Indexes for Performance
-- ===================================

-- ===================================
-- WORKFLOW TABLE OPTIMIZATIONS
-- ===================================

-- Index for filtering/sorting workflows by phase
-- Usage: SELECT * FROM workflows WHERE fase = 'Marketing' AND company_id = ?
CREATE INDEX IF NOT EXISTS idx_workflows_company_fase
  ON workflows(company_id, fase);

-- Index for sorting workflows by total time (common in UI)
-- Usage: SELECT * FROM workflows WHERE company_id = ? ORDER BY tempo_totale DESC
CREATE INDEX IF NOT EXISTS idx_workflows_company_tempo
  ON workflows(company_id, tempo_totale DESC);

-- Index for fetching recent workflows
-- Usage: SELECT * FROM workflows WHERE company_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_workflows_company_created
  ON workflows(company_id, created_at DESC);

-- GIN index for array containment queries on tools
-- Usage: SELECT * FROM workflows WHERE 'Excel' = ANY(tool)
CREATE INDEX IF NOT EXISTS idx_workflows_tool_gin
  ON workflows USING GIN (tool);

-- Partial index for PII-sensitive workflows (better performance for filtering)
-- Usage: SELECT * FROM workflows WHERE company_id = ? AND pii = true
CREATE INDEX IF NOT EXISTS idx_workflows_pii
  ON workflows(company_id) WHERE pii = true;

-- Partial index for HITL workflows (human-in-the-loop)
-- Usage: SELECT * FROM workflows WHERE company_id = ? AND hitl = true
CREATE INDEX IF NOT EXISTS idx_workflows_hitl
  ON workflows(company_id) WHERE hitl = true;

-- ===================================
-- EVALUATION TABLE OPTIMIZATIONS
-- ===================================

-- Index for sorting by priority score
-- Usage: SELECT * FROM evaluations e JOIN workflows w ON w.id = e.workflow_id
--        WHERE w.company_id = ? ORDER BY e.priorita DESC
CREATE INDEX IF NOT EXISTS idx_evaluations_priorita
  ON evaluations(priorita DESC);

-- Index for sorting by automation score
-- Usage: Filtering high automation potential workflows
CREATE INDEX IF NOT EXISTS idx_evaluations_auto_score
  ON evaluations(auto_score DESC);

-- Index for sorting by complexity
-- Usage: Finding low-complexity, high-impact workflows (quick wins)
CREATE INDEX IF NOT EXISTS idx_evaluations_complessita
  ON evaluations(complessita ASC);

-- Compound index for quick wins analysis (low complexity + high priority)
CREATE INDEX IF NOT EXISTS idx_evaluations_quick_wins
  ON evaluations(complessita ASC, priorita DESC);

-- ===================================
-- COMPANY TABLE OPTIMIZATIONS
-- ===================================

-- Index for fetching user's recent companies
-- Usage: SELECT * FROM companies WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_companies_user_created
  ON companies(user_id, created_at DESC);

-- Index for companies with implementation plans
-- Usage: SELECT * FROM companies WHERE user_id = ? AND implementation_plan IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_companies_with_plan
  ON companies(user_id) WHERE implementation_plan IS NOT NULL;

-- ===================================
-- API USAGE TABLE OPTIMIZATIONS
-- ===================================

-- Index for counting API calls by endpoint per user
-- Usage: SELECT endpoint, COUNT(*) FROM api_usage
--        WHERE user_id = ? AND created_at > ? GROUP BY endpoint
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint
  ON api_usage(user_id, endpoint, created_at DESC);

-- Partial index for recent API usage (last 30 days)
-- Improves performance for usage analytics
CREATE INDEX IF NOT EXISTS idx_api_usage_recent
  ON api_usage(user_id, created_at DESC)
  WHERE created_at > NOW() - INTERVAL '30 days';

-- ===================================
-- MAINTENANCE FUNCTIONS
-- ===================================

-- Function to clean up old API usage data (older than 90 days)
-- Run periodically to prevent table bloat
CREATE OR REPLACE FUNCTION cleanup_old_api_usage()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM api_usage
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- QUERY PERFORMANCE TIPS
-- ===================================

-- For best performance, use these query patterns:

-- 1. Get user's workflows with evaluations:
--    SELECT w.*, e.priorita, e.auto_score
--    FROM workflows w
--    LEFT JOIN evaluations e ON e.workflow_id = w.id
--    WHERE w.company_id = ?
--    ORDER BY e.priorita DESC NULLS LAST;

-- 2. Get workflows by tool:
--    SELECT * FROM workflows
--    WHERE company_id = ? AND 'Excel' = ANY(tool);

-- 3. Get high-priority, low-complexity workflows (quick wins):
--    SELECT w.*, e.priorita, e.complessita
--    FROM workflows w
--    JOIN evaluations e ON e.workflow_id = w.id
--    JOIN companies c ON c.id = w.company_id
--    WHERE c.user_id = ? AND e.priorita > 5 AND e.complessita < 3
--    ORDER BY e.priorita DESC, e.complessita ASC;

-- 4. Get API usage stats for last 30 days:
--    SELECT endpoint, COUNT(*) as call_count
--    FROM api_usage
--    WHERE user_id = ? AND created_at > NOW() - INTERVAL '30 days'
--    GROUP BY endpoint
--    ORDER BY call_count DESC;

-- ===================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ===================================

-- Update statistics for query optimizer
ANALYZE users;
ANALYZE companies;
ANALYZE workflows;
ANALYZE evaluations;
ANALYZE api_usage;

-- ===================================
-- OPTIMIZATION COMPLETE
-- ===================================
