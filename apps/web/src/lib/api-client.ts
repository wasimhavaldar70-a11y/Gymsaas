const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export class ApiError extends Error {
  public code: string;
  public details?: any;
  public status: number;

  constructor(message: string, status: number, code: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  // Get token from localStorage if present
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("gymcare_token");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {})
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    const json = await res.json();

    if (!res.ok || json.success === false) {
      throw new ApiError(
        json.error?.message || "An unexpected error occurred",
        res.status,
        json.error?.code || "REQUEST_FAILED",
        json.error?.details
      );
    }

    return json.data as T;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || "Network request failed", 500, "NETWORK_ERROR");
  }
}
