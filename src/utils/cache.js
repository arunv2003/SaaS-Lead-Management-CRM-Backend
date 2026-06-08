import { userModel } from "../models/user.models.js";

class InMemoryCache {
  constructor() {
    this.cache = new Map();
  }

  set(key, value, ttlSeconds = 60) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  del(key) {
    this.cache.delete(key);
  }

  flush() {
    this.cache.clear();
  }
}

export const cache = new InMemoryCache();

export const getTenantPlan = async (tenantId) => {
  const cacheKey = `tenant_plan:${tenantId}`;

  console.log("get Tenant id",tenantId)

  let plan = cache.get(cacheKey);

  if (!plan) {
    const tenantAdmin = await userModel
      .findById(tenantId)
      .populate("plan", "name price leadLimit userLimit");

    plan = tenantAdmin?.plan || null;

    cache.set(cacheKey, plan, 60);
  }

  return plan;
};

export const getTenantStaff = async (tenantId) => {
  const cacheKey = `tenant_staff:${tenantId}`;
  console.log("get Tenant id",tenantId)

  let staff = cache.get(cacheKey);

  if (!staff) {
    staff = await userModel
      .find({
        role: "staff",
        createdBy: tenantId,
      })
      .sort({ _id: 1 });

    cache.set(cacheKey, staff, 60);
  }

  return staff;
};

export const invalidateTenantPlan = (tenantId) => {
  cache.del(`tenant_plan:${tenantId}`);
};

export const invalidateTenantStaff = (tenantId) => {
  cache.del(`tenant_staff:${tenantId}`);
};