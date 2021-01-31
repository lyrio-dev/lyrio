-- The write intent key of this lock
-- The value is the random token of the client attempting to write-lock it
-- It will block ALL new read and write lock requests
local key_write_intent = KEYS[1]

-- The write lock key of this lock
-- The value is the random token of the locker
-- It will block ALL new read and write lock requests
local key_write_lock = KEYS[2]

-- The read lock key of this lock
-- The value is how many readers have locked this lock
-- It will block ALL new write lock requests
-- The expire time is refreshed by the latest locker who sends a refresh request
local key_readers = KEYS[3]

-- Lock the write lock with random token, with a expire time in MS
local function write_lock(token, expire)
  local value_readers = redis.call("get", key_readers)
  local value_write_lock = redis.call("get", key_write_lock)
  local value_write_intent = redis.call("get", key_write_intent)
  if value_readers ~= false or value_write_lock ~= false then
    -- A reader or writer is locked the lock
    -- Attempt to set the write intent

    if value_write_intent == false or value_write_intent == token then
      redis.call("set", key_write_intent, token, "PX", expire)
      return false
    end

    -- Failed to set the write intent -- we must wait for the previous waiting writer
    return false
  end

  -- If another writer set the write intent, let it first
  if value_write_intent ~= false and value_write_intent ~= token then
    return false
  end

  -- Remove the write intent
  redis.call("del", key_write_intent)

  -- Lock the write lock
  redis.call("set", key_write_lock, token, "PX", expire)
  return true
end

-- Unlock the write lock locked with the given token by this client
local function write_unlock(token)
  if redis.call("get", key_write_lock) == token then
    redis.call("del", key_write_lock)
    return true
  end

  return false
end

-- Reset expire time of the write lock locked with the given token by this client
local function write_refresh(token, expire)
  if redis.call("get", key_write_lock) == token then
    redis.call("pexpire", key_write_lock, expire)
    return true
  end

  return false
end

-- Lock the read lock with a expire time in MS
local function read_lock(expire)
  local value_write_intent = redis.call("get", key_write_intent)
  local value_write_lock = redis.call("get", key_write_lock)
  if value_write_intent ~= false or value_write_lock ~= false then
    -- A writer holds the lock or a writer is attmpting to lock the lock
    -- Let the writers first
    return false
  end

  -- Increase the number of readers
  redis.call("incr", key_readers)

  -- Refresh the expire time of read lock
  redis.call("pexpire", key_readers, expire)
  return true
end

-- Unlock the read lock locked by this client
local function read_unlock()
  local value_readers = redis.call("get", key_readers)
  if value_readers == false then
    -- It expired before unlock or refresh
    return false
  end

  -- If this is the last reader to release the lock, delete the key
  if value_readers == 1 then
    redis.call("del", key_readers)
  else
    redis.call("decr", key_readers)
  end

  return true
end

-- Reset expire time of the read lock locked by this client
local function read_refresh(expire)
  return redis.call("pexpire", key_readers, expire)
end

-- Handle commands from Redis client
if ARGV[1] == "write_lock" then
  return write_lock(ARGV[2], ARGV[3])
elseif ARGV[1] == "write_unlock" then
  return write_unlock(ARGV[2])
elseif ARGV[1] == "write_refresh" then
  return write_refresh(ARGV[2], ARGV[3])
elseif ARGV[1] == "read_lock" then
  return read_lock(ARGV[2])
elseif ARGV[1] == "read_unlock" then
  return read_unlock()
elseif ARGV[1] == "read_refresh" then
  return read_refresh(ARGV[2])
end
