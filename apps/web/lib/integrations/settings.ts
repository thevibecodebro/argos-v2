export const INTEGRATIONS_SETTINGS_PATH = "/settings/integrations";

type SearchParamValue = string | string[] | undefined;

const ZOOM_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Zoom connection was canceled before authorization completed.",
  callback_failed: "Zoom connection failed before setup finished. Retry from Integrations.",
  forbidden: "Only Argos admins can connect Zoom.",
  invalid_state: "Zoom setup session was invalid. Start the connection from Integrations again.",
  missing_params: "Zoom did not return the parameters Argos expected. Retry the connection.",
  no_session: "Sign in again before finishing Zoom connection.",
  not_configured: "Zoom is unavailable in this environment until ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET are configured.",
  not_provisioned: "Finish Argos onboarding before connecting Zoom.",
  session_expired: "The Zoom setup session expired. Start the connection again.",
  state_mismatch: "Zoom setup could not verify the request. Start the connection again.",
};

const GHL_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Go High Level connection was canceled before authorization completed.",
  callback_failed: "Go High Level setup failed before the location connection finished. Retry from Integrations.",
  forbidden: "Only Argos admins can connect Go High Level.",
  invalid_state: "Go High Level setup session was invalid. Start the connection from Integrations again.",
  missing_params: "Go High Level did not return the parameters Argos expected. Retry the connection.",
  no_session: "Sign in again before finishing Go High Level connection.",
  not_configured: "Go High Level is unavailable in this environment until GHL_CLIENT_ID and GHL_CLIENT_SECRET are configured.",
  not_provisioned: "Finish Argos onboarding before connecting Go High Level.",
  session_expired: "The Go High Level setup session expired. Start the connection again.",
  state_mismatch: "Go High Level setup could not verify the request. Start the connection again.",
};

const ZOOM_NOTICE_MESSAGES: Record<string, string> = {
  webhook_registration_failed:
    "Zoom connected, but webhook registration failed. Recording ingest will stay unavailable until webhook setup succeeds.",
};

function firstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function getIntegrationSettingsNotices(
  searchParams?: Record<string, SearchParamValue>,
) {
  if (!searchParams) {
    return [];
  }

  const notices: string[] = [];
  const zoomError = firstValue(searchParams.zoom_error);
  const ghlError = firstValue(searchParams.ghl_error);
  const zoomNotice = firstValue(searchParams.zoom_notice);
  const zoomConnected = firstValue(searchParams.zoom_connected);
  const ghlConnected = firstValue(searchParams.ghl_connected);

  if (zoomConnected === "true") {
    notices.push("Zoom is connected.");
  }

  if (ghlConnected === "true") {
    notices.push("Go High Level is connected.");
  }

  if (zoomNotice && ZOOM_NOTICE_MESSAGES[zoomNotice]) {
    notices.push(ZOOM_NOTICE_MESSAGES[zoomNotice]);
  }

  if (zoomError && ZOOM_ERROR_MESSAGES[zoomError]) {
    notices.push(ZOOM_ERROR_MESSAGES[zoomError]);
  }

  if (ghlError && GHL_ERROR_MESSAGES[ghlError]) {
    notices.push(GHL_ERROR_MESSAGES[ghlError]);
  }

  return notices;
}
