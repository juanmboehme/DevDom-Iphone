/**
 * Notification that the UI is about to transition to a new page.
 * Perform custom prepage-transition logic here.
 * @param {String} currentPageId 
 * @param {String} targetPageId 
 * @returns {boolean} true to continue transtion; false to halt transition
 */
phoneui.prePageTransition = function(currentPageId,targetPageId) {
  // add custom pre-transition code here
  // return false to terminate transition
  return true;
}

/**
 * Notification that the UI has transition to a new page.
 * 
 * @param {String} newPageId 
 */
phoneui.postPageTransition = function(newPageId) {
  
}

/**
 * Notification that device orientation has changed. 
 * 
 * @param {String} newOrientation 
 */
phoneui.postOrientationChange = function(newOrientation) {
  
}

/**
 * Called when document is loaded.
 */
phoneui.documentReadyHandler = function() {
}

