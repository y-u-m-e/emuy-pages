/**
 * =============================================================================
 * API CONFIGURATION
 * =============================================================================
 * Central configuration for all API endpoints.
 * Routes to the appropriate microservice based on the feature.
 */

// API Base URLs for each microservice
const isDev = import.meta.env.DEV;

export const API_URLS = {
  // Auth service - handles login, users, roles, permissions
  AUTH: isDev 
    ? 'http://localhost:8787' 
    : 'https://auth.api.emuy.gg',
  
  // Attendance service - handles cruddy panel, leaderboards
  ATTENDANCE: isDev 
    ? 'http://localhost:8788' 
    : 'https://attendance.api.emuy.gg',
  
  // Events service - handles tile events
  EVENTS: isDev 
    ? 'http://localhost:8789' 
    : 'https://events.api.emuy.gg',
  
  // OSRS service - handles WOM, hiscores
  OSRS: isDev 
    ? 'http://localhost:8790' 
    : 'https://osrs.api.emuy.gg',
  
  // Bingo service - handles bingo events
  BINGO: isDev 
    ? 'http://localhost:8791' 
    : 'https://bingo.api.emuy.gg',
};

// Legacy API_BASE for backwards compatibility
// Points to auth service by default since most /auth/* calls go there
export const API_BASE = API_URLS.AUTH;

