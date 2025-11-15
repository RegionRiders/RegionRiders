declare module 'strava-v3' {
  type StravaConfig = {
    client_id: string;
    client_secret: string;
    redirect_uri: string;
    access_token: string;
  };

  type OAuthRequestParams = {
    scope: string;
  };

  type AthleteInfo = {
    id: number;
    username?: string;
    firstname?: string;
    lastname?: string;
    [key: string]: any;
  };

  type TokenResponse = {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete: AthleteInfo;
  };

  type OAuth = {
    getRequestAccessURL(params: OAuthRequestParams): Promise<string>;
    getToken(code: string): Promise<TokenResponse>;
  };

  type Strava = {
    config(config: Partial<StravaConfig>): void;
    oauth: OAuth;
  };

  const strava: Strava;
  export default strava;
}
