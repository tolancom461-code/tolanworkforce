import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

/**
 * Supabase REST API client for database operations.
 * Since the Manus environment blocks direct PostgreSQL connections (port 5432/6543),
 * we use Supabase's REST API instead.
 * 
 * This module provides a thin wrapper around Supabase REST API calls
 * that mimics the Drizzle ORM interface we defined in schema.ts
 */

interface SupabaseUser {
  id: string;
  username: string;
  email: string | null;
  password_hash: string | null;
  full_name: string | null;
  full_name_ar: string | null;
  phone: string | null;
  role: string;
  is_active: string | null;
}

/**
 * Get a user by their username using Supabase REST API
 * Maps REST API response to our User type
 */
export async function getUserByUsername(username: string) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn("[Database] Supabase credentials not available");
      return undefined;
    }

    // Build the REST API URL with query parameters
    const url = `${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(username)}&limit=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Database] Failed to get user: ${response.status} ${response.statusText}`);
      return undefined;
    }

    const data: SupabaseUser[] = await response.json();
    
    if (data.length === 0) {
      return undefined;
    }

    // Map Supabase response to our User type (camelCase)
    const user = data[0];
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      passwordHash: user.password_hash,
      fullName: user.full_name,
      fullNameAr: user.full_name_ar,
      phone: user.phone,
      role: user.role,
      isActive: user.is_active,
    };
  } catch (error) {
    console.error("[Database] Failed to get user by username:", error);
    throw error;
  }
}

/**
 * Upsert a user into the database using Supabase REST API.
 * For local users, use username as the unique identifier.
 */
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.username) {
    throw new Error("Username is required for upsert");
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn("[Database] Supabase credentials not available");
      return;
    }

    // Build the insert/update payload (snake_case for database)
    const payload: Record<string, any> = {
      username: user.username,
    };

    if (user.email !== undefined) payload.email = user.email;
    if (user.passwordHash !== undefined) payload.password_hash = user.passwordHash;
    if (user.fullName !== undefined) payload.full_name = user.fullName;
    if (user.fullNameAr !== undefined) payload.full_name_ar = user.fullNameAr;
    if (user.phone !== undefined) payload.phone = user.phone;
    if (user.role !== undefined) payload.role = user.role;
    if (user.isActive !== undefined) payload.is_active = user.isActive;

    // Try to insert first
    const insertUrl = new URL(`${supabaseUrl}/rest/v1/users`);
    const insertResponse = await fetch(insertUrl.toString(), {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (insertResponse.ok) {
      console.log("[Database] User inserted successfully");
      return;
    }

    // If insert fails with conflict, try update
    if (insertResponse.status === 409) {
      const updateUrl = new URL(`${supabaseUrl}/rest/v1/users`);
      updateUrl.searchParams.append('username', `eq.${user.username}`);

      const updateResponse = await fetch(updateUrl.toString(), {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(payload),
      });

      if (!updateResponse.ok) {
        console.error(`[Database] Failed to update user: ${updateResponse.status}`);
        throw new Error(`Failed to update user: ${updateResponse.statusText}`);
      }

      console.log("[Database] User updated successfully");
      return;
    }

    console.error(`[Database] Failed to upsert user: ${insertResponse.status}`);
    throw new Error(`Failed to upsert user: ${insertResponse.statusText}`);
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

// TODO: add feature queries here as your schema grows.


/**
 * Worker interface - maps to workers table in Supabase
 */
export interface Worker {
  id: string;
  name: string;
  name_ar: string | null;
  email: string | null;
  phone: string | null;
  job_id: string | null;
  group_id: string | null;
  cost_center_id: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Get all workers from Supabase
 */
export async function getWorkers() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn("[Database] Supabase credentials not available");
      return [];
    }

    const url = `${supabaseUrl}/rest/v1/workers?order=created_at.desc`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Database] Failed to get workers: ${response.status}`);
      return [];
    }

    const data: Worker[] = await response.json();
    return data;
  } catch (error) {
    console.error("[Database] Failed to get workers:", error);
    return [];
  }
}

/**
 * Get a single worker by ID
 */
export async function getWorkerById(id: string) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn("[Database] Supabase credentials not available");
      return undefined;
    }

    const url = `${supabaseUrl}/rest/v1/workers?id=eq.${encodeURIComponent(id)}&limit=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Database] Failed to get worker: ${response.status}`);
      return undefined;
    }

    const data: Worker[] = await response.json();
    return data.length > 0 ? data[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get worker by ID:", error);
    return undefined;
  }
}

/**
 * Get count of all workers
 */
export async function getWorkersCount() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn("[Database] Supabase credentials not available");
      return 0;
    }

    const url = `${supabaseUrl}/rest/v1/workers?select=count()`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact',
      },
    });

    if (!response.ok) {
      console.error(`[Database] Failed to get workers count: ${response.status}`);
      return 0;
    }

    const countHeader = response.headers.get('content-range');
    if (countHeader) {
      const match = countHeader.match(/\d+\/(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return 0;
  } catch (error) {
    console.error("[Database] Failed to get workers count:", error);
    return 0;
  }
}

/**
 * Attendance Event interface
 */
export interface AttendanceEvent {
  id: string;
  worker_id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  date: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Get attendance events
 */
export async function getAttendanceEvents(limit = 100, offset = 0) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn("[Database] Supabase credentials not available");
      return [];
    }

    const url = `${supabaseUrl}/rest/v1/attendance_events?order=date.desc&limit=${limit}&offset=${offset}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Database] Failed to get attendance events: ${response.status}`);
      return [];
    }

    const data: AttendanceEvent[] = await response.json();
    return data;
  } catch (error) {
    console.error("[Database] Failed to get attendance events:", error);
    return [];
  }
}

/**
 * Get attendance count
 */
export async function getAttendanceCount() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn("[Database] Supabase credentials not available");
      return 0;
    }

    const url = `${supabaseUrl}/rest/v1/attendance_events?select=count()`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact',
      },
    });

    if (!response.ok) {
      console.error(`[Database] Failed to get attendance count: ${response.status}`);
      return 0;
    }

    const countHeader = response.headers.get('content-range');
    if (countHeader) {
      const match = countHeader.match(/\d+\/(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return 0;
  } catch (error) {
    console.error("[Database] Failed to get attendance count:", error);
    return 0;
  }
}
