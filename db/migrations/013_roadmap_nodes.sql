CREATE TABLE IF NOT EXISTS roadmap_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_type VARCHAR(40) NOT NULL,
  topic_key VARCHAR(120) NOT NULL,
  order_index INTEGER NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'locked',
  icon_key VARCHAR(40) NOT NULL DEFAULT 'topic',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  CONSTRAINT uq_roadmap_user_topic_order UNIQUE (user_id, topic_key, order_index)
);

CREATE INDEX IF NOT EXISTS ix_roadmap_nodes_user_id
  ON roadmap_nodes(user_id);

CREATE INDEX IF NOT EXISTS ix_roadmap_nodes_order
  ON roadmap_nodes(user_id, order_index);

CREATE INDEX IF NOT EXISTS ix_roadmap_nodes_status
  ON roadmap_nodes(status);

CREATE INDEX IF NOT EXISTS ix_roadmap_nodes_topic_key
  ON roadmap_nodes(topic_key);
