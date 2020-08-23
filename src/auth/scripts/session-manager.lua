-- I do NOT use the KEYS array because I don't use Redis cluster currently.
-- In the future if I use cluster, I'll use key{session} to let ALL session related keys to be put to the same slot.

-- We preserve the most recent 20 sessions for a user. The older sessions will be removed once exceeded this limit.
local MAX_SESSIONS_PER_USER = 20

-- We use a auto increment ID as session's ID.
local REDIS_KEY_USER_SESSION_ID_AUTO_INCREMENT = "user-session-auto-increment"

-- We manage a user's session list with a ZSET.
-- The score of a item is that session's timestamp.
-- The member of a item is that session's ID.
-- Whenever a session is accessed, the timestamp will be refreshed to the current time.
-- When a new session is created, the old sessions will be evicted.
local REDIS_KEY_USER_SESSION_LIST = "user-session-list:%d";

-- We store ALL the real session info in a map, from the session ID to the JSON serialized "session info".
local REDIS_KEY_USER_SESSION_INFO_MAP = "user-session-info-map";

-- Create a new session (when the user logged in or registered and so on)
-- The session info is immutable for a session
-- Returns the new session ID
local function new_session(timestamp, user_id, session_info)
  -- Store new session's session info in map
  local session_id = redis.call("incr", REDIS_KEY_USER_SESSION_ID_AUTO_INCREMENT)
  redis.call("hset", REDIS_KEY_USER_SESSION_INFO_MAP, session_id, session_info)

  -- Add new session's item to user's session list
  local session_list_key = string.format(REDIS_KEY_USER_SESSION_LIST, user_id)
  redis.call("zadd", session_list_key, timestamp, session_id)

  -- Check if the session count exceeded the limit and remove old sessions
  while redis.call("zcard", session_list_key) > MAX_SESSIONS_PER_USER do
    local old_session_item = redis.call("zpopmin", session_list_key)

    local old_session_id = old_session_item[1]
    redis.call("hdel", REDIS_KEY_USER_SESSION_INFO_MAP, old_session_id)
  end

  return session_id
end

-- Access a existing session
-- The session's timestamp will be refreshed
-- Returns true if the session is valid, false if the session has been deleted
local function access_session(timestamp, user_id, session_id)
  -- Update timestamp in the session list
  local session_list_key = string.format(REDIS_KEY_USER_SESSION_LIST, user_id)
  local elements_updates = redis.call("zadd", session_list_key, "XX", "CH", timestamp, session_id)

  -- If we updated a element's score successfully, the session EXISTS in the list
  if elements_updates == 1 then
    return true
  end

  -- If no elements are updated, we need to check if the session doesn't EXIST in the list
  -- or the timestamp didn't changed
  return redis.call("zscore", session_list_key, session_id) ~= false
end

-- Delete a session manmully (when user logout)
-- Returns nothing
local function end_session(user_id, session_id)
  local session_list_key = string.format(REDIS_KEY_USER_SESSION_LIST, user_id)
  redis.call("zrem", session_list_key, session_id)
  redis.call("hdel", REDIS_KEY_USER_SESSION_INFO_MAP, session_id)
end

-- Handle commands from Redis client
if ARGV[1] == "new" then
  return new_session(ARGV[2], ARGV[3], ARGV[4])
elseif ARGV[1] == "access" then
  return access_session(ARGV[2], ARGV[3], ARGV[4])
elseif ARGV[1] == "end" then
  return end_session(ARGV[2], ARGV[3])
end
