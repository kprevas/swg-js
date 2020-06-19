import { tryParseJson, parseJson } from "../utils/json";

const LOGIN_REDIRECT_PARAM = 'googleLoginRedirect';

/**
 */
export class AppLoginManager {
  constructor() {
    /** @private {?MessagePort} */
    this.messagePort_ = null;

    /** @private {?string} */
    this.postLoginRedirectUrl_ =
      new URL(window.location.href).searchParams.get(LOGIN_REDIRECT_PARAM);

    /** @private {?string} */
    this.loginPageUrl_ = null;

    /** @private {!Promise<!{userId: string, userAttributes: Array<string>}>} */
    this.loginPromise_ = new Promise((resolve, reject) => {
      const messageListener = messageEvent => {
        const data = tryParseJson(messageEvent.data);
        if (data && data['app'] === '__GARAMOND__') {
          if (data['name'] === 'handshake-poll' && !this.redirectUrl_) {
            this.messagePort_ = messageEvent.ports[0];
            this.messagePort_.postMessage('{ \'name\': \'handshake\' }');
            this.messagePort_.onmessage = messageListener;
            this.messagePort_.onmessageerror = e => {
              // PROTOTYPE CODE
              console.error(e.data);
            }
            this.postLoginRedirectUrl_ = data['loginRedirectUrl'];
          } else if (data['name'] === 'login-payload') {
            resolve(parseJson(data['payload']));
          }
        }
      }
      window.addEventListener('message', messageListener);
    });
  }

  /**
   * @return {boolean}
   */
  isGoogleAppLoginFlowActive() {
    return !!this.postLoginRedirectUrl_;
  }

  /**
   * @return {boolean}
   */
  isGoogleAppLoginFlowRequired() {
    return !!this.loginPageUrl_;
  }

  /**
   * @param {string} loginUrl
   * @return {!Promise<!{userId: string, userAttributes: Array<string>}>}
   */
  startGoogleAppLoginFlow(loginUrl) {
    if (this.messagePort_ && this.postLoginRedirectUrl_) {
      const url = new URL(loginUrl);
      url.searchParams.append(LOGIN_REDIRECT_PARAM, this.postLoginRedirectUrl_);
      this.messagePort_.postMessage(`{ 'name': 'login', 'url': '${url.href}' }`);
    }
    return this.loginPromise_;
  }

  /**
   * @param {!{userId: string, userAttributes: Array<string>}} userState
   */
  googleAppLoginFlowComplete(userState) {
    const userStateStr = encodeURI(JSON.stringify(
      /** @type {!JsonObject} */ (userState)));
    window.location.href =
      `${this.postLoginRedirectUrl_}?userState=${userStateStr}`;
  }
}
