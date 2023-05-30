function getURL(url) {
  try {
    return browser.runtime.getURL(url);
  }
  catch(e) {
    document.location.reload();
  }
}