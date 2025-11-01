declare module 'strava-v3' {
  interface StravaConfig {
    client_id: string;
    client_secret: string;
    redirect_uri: string;
    access_token: string;
  }

  interface OAuthRequestParams {
    scope: string;
  }

  interface AthleteInfo {
    id: number;
    username?: string;
    firstname?: string;
    lastname?: string;
    [key: string]: any;
  }

  interface TokenResponse {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete: AthleteInfo;
  }

  interface OAuth {
    getRequestAccessURL(params: OAuthRequestParams): Promise<string>;
    getToken(code: string): Promise<TokenResponse>;
  }

  interface Strava {
    config(config: Partial<StravaConfig>): void;
    oauth: OAuth;
  }

  const strava: Strava;
  export default strava;
}

