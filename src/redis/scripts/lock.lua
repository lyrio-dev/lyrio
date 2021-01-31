-- The key of the lock requested to operate with
-- The value of the key, if locked, is the locker's random token
local key_lock = KEYS[1]

-- Lock key_lock with random token, with a expire time in MS
local function lock(token, expire)
  return redis.call("set", key_lock, token, "NX", "PX", expire)
end

-- Unlock key_lock locked with the given token by this client
local function unlock(token)
  if redis.call("get", key_lock) == token then
    redis.call("del", key_lock)
    return true
  end

  return false
end

-- Reset expire time of the lock key_lock locked with the given token by this client
local function refresh(token, expire)
  if redis.call("get", key_lock) == token then
    redis.call("pexpire", key_lock, expire)
    return true
  end

  return false
end

-- Handle commands from Redis client
if ARGV[1] == "lock" then
  return lock(ARGV[2], ARGV[3])
elseif ARGV[1] == "unlock" then
  return unlock(ARGV[2])
elseif ARGV[1] == "refresh" then
  return refresh(ARGV[2], ARGV[3])
end
