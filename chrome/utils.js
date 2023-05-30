function getURL(url) {
  try {
    return chrome.runtime.getURL(url);
  }
  catch(e) {
    document.location.reload();
  }
}