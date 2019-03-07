
function createOverlay() {
  const root = document.createElement('span');
  const shadow = root.attachShadow({ mode: 'closed' });
  // TODO: remove CSS framework - all styles here should be custom and inline to
  // prevent interference from page
  const html = `
    <style type="text/css">
    :host {
      all: initial
    }
    .hidden {
      display: none;
    }
    .ui {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2147483647 !important;
    }
    .notification {
      position: absolute !important;
      width: 350px;
      right: 30px;
      margin: 25px;
    }
    </style>
    <div class="ui hidden" id="mask">
      <div id="wrapper">
        <div class="modal is-active">
          <div class="modal-background"></div>
          <div class="modal-content">
            <div class="box">
              <article class="media">
                <div class="media-left">
                  <figure class="image">
                    <img src="${chrome.runtime.getURL('icons/png/128x128_logo-chrome.png')}" alt="Re:consent Logo"/>
                  </figure>
                </div>
                <div class="media-content hidden" id="modal">
                  <p>Re:consent can automatically manage your consent on this site.</p>
                  <div class="field is-grouped">
                    <div class="control" id="button-deny">
                      <button class="button is-success is-large">Deny all</button>
                    </div>
                    <div class="control" id="button-allow">
                      <button class="button is-danger is-large">Allow all</button>
                    </div>
                    <div class="control" id="button-custom">
                      <button class="button is-large is-text">Custom</buttom>
                    </div>
                  </div>
                  <div class="field">
                    <div class="select is-medium">
                      <select id="option-settings">
                        <option value="always">Always chose this option for all sites</option>
                        <option value="site">Chose this option for this site only</option>
                        <option value="once">Just once</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div class="media-content hidden" id="overlay">
                  <p id="waiting-text"></p>
                  <p class="subtitle">You can always review your settings from the re:consent icon in the url bar.</p>
                  <div class="control" id="button-cancel">
                    <button class="button is-large is-text">Close</button>
                  </div>
                </div>
              </article>
            </div>
          </div>
          <button class="modal-close is-large" aria-label="close" id="close-button"></button>
        </div>
      </div>
      <div class="notification hidden" id="notification">
        <button class="delete" id="notification-hide"></button>
        <article class="media">
          <figure class="media-left">
            <p class="image">
              <img src="${chrome.runtime.getURL('icons/png/128x128_logo-chrome.png')}" alt="Re:consent Logo"/>
            </p>
          </figure>
          <div class="media-content">
            <p class="content" id="notification-text">Re:consent notification</p>
          </div>
        </article>
      </div>
    </div>
  `;
  shadow.innerHTML = html;

  // reduce z-index of any other popup
  function reduceZIndex(e) {
    if (window.getComputedStyle(e).zIndex === '2147483647') {
      e.style = 'z-index: 2147483646 !important';
    }
  }
  document.querySelectorAll('body > div').forEach(reduceZIndex);
  document.querySelectorAll('#gdpr-modal-html').forEach(reduceZIndex);

  const firstElement = document.querySelector('body > :first-child');
  if (firstElement) {
    document.body.insertBefore(root, firstElement);
  } else {
    document.body.appendChild(root);
  }

  function showModel() {
    shadow.getElementById('overlay').className = 'media-content hidden';
    shadow.getElementById('modal').className = 'media-content';
    shadow.getElementById('mask').className = 'ui';
    shadow.getElementById('wrapper').className = '';
  }
  function showOverlay(msg) {
    shadow.getElementById('modal').className = 'media-content hidden';
    shadow.getElementById('waiting-text').innerText = msg;
    shadow.getElementById('overlay').className = 'media-content';
    shadow.getElementById('mask').className = 'ui';
    shadow.getElementById('wrapper').className = '';
  }
  function hideOverlay() {
    shadow.getElementById('mask').className = 'ui hidden';
    shadow.getElementById('overlay').className = 'media-content hidden';
    shadow.getElementById('modal').className = 'media-content hidden';
    shadow.getElementById('wrapper').className = 'hidden';
  }
  function hideNotification() {
    shadow.getElementById('mask').className = 'ui hidden';
    shadow.getElementById('notification').className = 'notification hidden';
  }
  function showNotification(msg, timeout = 10000) {
    shadow.getElementById('notification-text').innerText = msg;
    shadow.getElementById('notification').className = 'notification';
    shadow.getElementById('mask').className = 'ui';
    setTimeout(hideNotification, timeout);
  }

  const link = document.createElement('link');
  link.setAttribute('rel', 'stylesheet');
  link.href = chrome.runtime.getURL('css/bulma.css');
  shadow.appendChild(link);

  shadow.getElementById('close-button').addEventListener('click', () => {
    hideOverlay();
  });
  shadow.getElementById('button-cancel').addEventListener('click', () => {
    hideOverlay();
  });

  shadow.getElementById('button-allow').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      type: 'user-consent',
      action: 'allow',
      when: shadow.getElementById('option-settings').value,
    });
    showOverlay('Allowing all consents for this site, please wait...');
  });
  shadow.getElementById('button-deny').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      type: 'user-consent',
      action: 'deny',
      when: shadow.getElementById('option-settings').value,
    });
    showOverlay('Denying all consents for this site, please wait...');
  });
  shadow.getElementById('button-custom').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      type: 'user-consent',
      action: 'custom',
      when: shadow.getElementById('option-settings').value,
    });
    hideOverlay();
  });
  shadow.getElementById('notification-hide').addEventListener('click', () => {
    hideNotification();
  });

  return {
    showModel,
    showOverlay,
    hide: hideOverlay,
    showNotification,
  };
}

let overlay = null;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'click') {
    const elem = document.querySelectorAll(message.selector);
    if (elem.length > 0) {
      if (message.all === true) {
        elem.forEach(e => e.click());
      } else {
        elem[0].click();
      }
    }
    return Promise.resolve(elem.length > 0);
  } else if (message.type === 'elemExists') {
    const exists = document.querySelector(message.selector) !== null;
    return Promise.resolve(exists);
  } else if (message.type === 'elemVisible') {
    const elem = document.querySelectorAll(message.selector);
    const results = new Array(elem.length);
    elem.forEach((e, i) => {
      results[i] = e.offsetParent !== null;
    });
    if (results.length === 0) {
      return Promise.resolve(false);
    } else if (message.check === 'any') {
      return Promise.resolve(results.some(r => r));
    } else if (message.check === 'none') {
      return Promise.resolve(results.every(r => !r));
    }
    // all
    return Promise.resolve(results.every(r => r));
  } else if (message.type === 'getAttribute') {
    const elem = document.querySelector(message.selector);
    if (!elem) {
      return Promise.resolve(false);
    }
    return Promise.resolve(elem.getAttribute(message.attribute));
  } else if (message.type === 'eval') {
    // TODO: chrome support
    const result = window.eval(message.script); // eslint-disable-line no-eval
    return Promise.resolve(result);
  } else if (message.type === 'prompt') {
    if (!overlay) {
      overlay = createOverlay();
    }
    if (message.action === 'showModal') {
      overlay.showModel();
    } else if (message.action === 'showOverlay') {
      overlay.showOverlay(message.message);
    } else if (message.action === 'showNotification') {
      overlay.showNotification(message.message, message.timeout);
    } else {
      overlay.hide();
    }
    return Promise.resolve(true);
  } else if (message.type === 'hide') {
    const parent = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
    const hidden = message.selectors.filter((selector) => {
      const matching = document.querySelectorAll(selector);
      return matching.length > 0;
    }, []);
    const rule = `${hidden.join(',')} { display: none !important; }`;
    const css = document.createElement('style');
    css.type = 'text/css';
    css.id = 're-consent-css-rules';
    css.appendChild(document.createTextNode(rule));
    parent.appendChild(css);
    return Promise.resolve(hidden);
  }
  return Promise.resolve(null);
});

chrome.runtime.sendMessage({
  type: 'frame',
  url: window.location.href,
});
