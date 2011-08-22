/*
 *  MobiOne PhoneUI Framework
 *  version 0.1.6.20110721
 *  <http://genuitec.com/mobile/resources/phoneui>
 *  (c) Copyright 2010, 2011 Genuitec, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ 
   
var phoneui = {};

/** 
  * Support for deprecated API mobione namespace
  * @deprecated 
  * @see phoneui
  */
var mobione = phoneui; 

// Initialize webapp for use by phoneui framework
$(document).ready(function() {
	jQuery.preloadCssImages();
	
	var webappCache = window.applicationCache;
	if (webappCache) {
		/*
		webappCache.addEventListener("checking", function() {
			phoneui.showActivityDialog("Checking for update...");
		}, false);
		*/
		var wasDownloaded = false;
		webappCache.addEventListener("noupdate", function() {
			phoneui.hideActivityDialog();
		}, false);
		webappCache.addEventListener("downloading", function() {
			phoneui.showActivityDialog("Updating...");
			wasDownloaded = true;
		}, false);
		webappCache.addEventListener("cached", function() {
			phoneui.hideActivityDialog();
		}, false);
		webappCache.addEventListener("updateready", function() { 
			location.reload(); // Reload page right after update came. 
		}, false);
		webappCache.addEventListener("obsolete", function() {
			phoneui.hideActivityDialog();
			// alert("Error: The manifest is no longer available (code 404). Unable to cache web page for offline use.");
			location.reload(); // Reload page, it seems user just switched off appcache
		}, false);
		webappCache.addEventListener("error", function(str) {
			phoneui.hideActivityDialog();
			if (wasDownloaded) {
				alert("Error: Unable to cache web page for offline use. Visit Safari settings and clear cache.");
			}
		}, false);

	}
	
	// Default platform (mostly for desktop browsers
	var touchEventsSupported;
	phoneui._platform = {
		init : function() {
			$(window).resize(function(e) {
				handleResizing();
			});
		},
		initAddressBarHiding : function() {},
		hideAddressBar : function() {},
		docsize : function() { return { x : window.innerWidth, y : window.innerHeight }; },
		touchevents : function() {
			if (typeof(touchEventsSupported) != "boolean") {
			    try {
			        document.createEvent("TouchEvent");
			        touchEventsSupported = true;
			    } catch (e) {
			    	touchEventsSupported = false;
			    }
			}
			return touchEventsSupported; 
		}
	};

	if (window.navigator.userAgent.toLowerCase().match(/(iphone|ipod)( simulator)?;/i)) {
		// iphone platform
		phoneui._platform = {
			init : function() {
				$('input, textarea, select').bind('blur', function(e) {
					// virtual keyboard disappeared, let's hide address bar
					phoneui._platform.hideAddressBar();
				});
			},
			initAddressBarHiding : function() {
				setTimeout(function() {
					phoneui._platform.hideAddressBar();
				}, 1000);
			},
			hideAddressBar : function() {
				window.scrollTo(0, 0);
			},
			docsize : function() {
				var p = (window.orientation % 180) == 0;
				// Take statusbar into account
				var bb = 20;
				var bbVisible = 
					!(window.PhoneGap) && 
					!window.navigator.standalone;
				if (bbVisible) {
					// Take buttonbar into account
					bb += (p ? 44 : 30);
					// Take addressbar height into account
					bb += m1Design.shouldHideAddressBar ? 0 : 60;
				}
				return { 
					x : (p ? 320 : 480), 
					y : ((p ? 480 : 320) - bb) }; 
			},
			touchevents : function() { 
				return true; 
			}
		};
	} else if (window.navigator.userAgent.toLowerCase().match(/(ipad)( simulator)?;/i)) {
		// ipad platform
		phoneui._platform = {
			init : function() {
				$(window).resize(function(e) {
					handleResizing();
				});
				$('input, textarea, select').bind('blur', function(e) {
					// virtual keyboard disappeared, let's hide address bar
					phoneui._platform.hideAddressBar();
				});
			},
			initAddressBarHiding : function() {},
			hideAddressBar : function() {
				window.scrollTo(0, 0);
			},
			docsize : function() { 
				return { x : window.innerWidth, y : window.innerHeight }; 
			},
			touchevents : function() {
				return true;  
			}
		};
	}

	function resizeScreen(currentScreen) {
		var s = phoneui._platform.docsize();
		// Set root screen element height - otherwise addressbar wouldn't disappear on iOS
		var t = $("." + m1Design.css('top-root') + ", " + currentScreen.anchor_id);
		t.height(s.y);
		t.width(s.x);
		currentScreen.resize(s.x, s.y); // Make first resize
		reinitscrollers($(currentScreen.anchor_id));
	}
	
	function handleResizing() {
		if (currentScreen) {		
			resizeScreen(currentScreen);
		}
	}
	
	var isSliding = false;
	var firstScreenTime = 1;
	var defAncPars = [m1Design.root(), 'NONE', firstScreenTime];
	var currentScreen = parseAnchor('');
	
	phoneui.getCurrentScreen = function() {
		return currentScreen;
	}
	
	handleResizing();

	// FORMAT: page_id:transition:time
	function parseAnchor(str) {
		var spl = str == "" ? [] : str.substr(1).split(':');
		
		// Append default params
		if (spl.length < defAncPars.length) {
			spl = spl.concat(defAncPars.slice(spl.length));
		}
		
		function obj() {};
		obj.prototype = m1Design.pages[spl[0]];
		var ret = new obj();
		ret.transition = spl[1];
		ret.time = spl[2];
		ret.equals = function(el) {
			return !el || (this.anchor_id == el.anchor_id);
		};
		ret.toString = function() { return this.anchor_id + ":" + this.transition; };
				
		return ret; 
	}
	
	// Install checkNewScreen as history change listener
	if ('onhashchange' in window) {
		window.onhashchange = checkNewScreen;
	} else {
		setInterval(checkNewScreen, 200);
	}

	phoneui._platform.init();

	if ('orientation' in window) {
		window.onorientationchange = function() {
			handleResizing();
			if (m1Design.shouldHideAddressBar) {
				phoneui._platform.initAddressBarHiding();
			}
			if ('postOrientationChange' in phoneui) {
				phoneui.postOrientationChange(window.orientation);			
			}
		};
	}
	
	checkNewScreen();
	
	var prevHref;
	function checkNewScreen() {
		var initialCall = !prevHref;
		if (prevHref != window.location.href) {
			prevHref = window.location.href;
			
			var nextScreen = parseAnchor(window.location.hash);
			
			if (!nextScreen.equals(currentScreen)) {
				var trans = nextScreen.transition;
				var back = false;
	
				if ((+nextScreen.time) < (+currentScreen.time)) {
					// We're moving back in history!
					trans = currentScreen.transition;
					back = true;
				}
				
				function doAnimate() {
					var $next = $(nextScreen.anchor_id);

					resizeScreen(nextScreen);

					animateNavigation( 
							$next, $(currentScreen.anchor_id), 
							initialCall ? "NONE" : trans, back, function() {
								currentScreen = nextScreen;
								callPostTransition();
							});	
				}
	
				if (nextScreen.dynamic &&
						// following case is special one - returning back from static page
						// to dynamic one shouldn't cause reload, otherwise our SLM pages
						// stops to work
						!(back && currentScreen && !currentScreen.dynamic)) {
					// Load page first
					loadExternalPage(nextScreen, doAnimate);
				} else {
					// Animate!
					doAnimate();
				}
			}
		}
	}

	function parseDPIPageData(data) {
		var pg = $('<div></div>');
		pg.html(data);
		var rt = pg.find('.' + m1Design.css('root'));
		preProcess(rt);
		rt.appendTo('.' + m1Design.css('top-root'));
	}
	
	function loadPageCssAndJs(nextScreen, onok) {
		var $next = $(nextScreen.anchor_id);
		if ($next.length > 0) {
			// Remove old div
			$next.remove();
		}

		// Load stylesheet as well
		$('<link rel="stylesheet" type="text/css" href="' + nextScreen.css_url() +'" >').appendTo("head");

		// LOADING AND ACTIVATE THE PAGE JS
		$.ajax({
		  url: nextScreen.js_url(),
		  dataType: 'script',
		  success: onok,
		  error: onok // Call onok anyway, we don't care about failed JS loading
		});
	}

	function loadExternalPage(nextScreen, onok) 
	{
		phoneui.showActivityDialog();
		
		loadPageCssAndJs(nextScreen, function () {
    		var req = new XMLHttpRequest();
    		req.open("GET", nextScreen.html_url(), true);
    		// req.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 2005 00:00:00 GMT");
    		var timer = setTimeout(function() {
    		       req.abort();
    		     }, 10000);
    		req.onreadystatechange = function() {
    			if (req.readyState == req.DONE) {
    				var ok = (req.status >= 200 && req.status < 300) || (req.status == 0 && req.responseText.length > 0); 
    				if (ok) {
    					clearTimeout(timer);

						parseDPIPageData(req.responseText);
    				}

    				phoneui.hideActivityDialog();

    				if (ok) {
    					onok();
    				}
    			}
    		}
    		req.send(null);
        });		
	}
	
	function callPreTransition(nextScreen) {
		if (currentScreen.equals(nextScreen)) {
			console.log('Page ' + currentScreen.anchor_id + ' already active');
			return false;
		}
		if ('prePageTransition' in phoneui) {
			var result = 
				!!(phoneui.prePageTransition(currentScreen.anchor_id, nextScreen.anchor_id));
			if (!result) {
				console.log('Page ' + nextScreen.anchor_id + ' pretransition veto');
			}
			return result;
		}		
		return true;
	}
	
	function callPostTransition() {
		// Unclick while transitioning to page
		var clickeable = $('.' + m1Design.css("clicked") + '.' + m1Design.css("hyperlink-internal"), 
				$(currentScreen.anchor_id));
		unclickme(clickeable);

		if ('postPageTransition' in phoneui) {
			phoneui.postPageTransition(currentScreen.anchor_id);
		}		
	}

	/**
	 * Get ID of current page. 
	 *
	 * @return ID String of the page. Is in the form of anchor (e.g., #m1-page1)
	 */
	phoneui.getCurrentPageId = function() {
		return currentScreen.anchor_id;
	}

	var getURIParameterByName = function(name) {
	  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
	  var regexS = "[\\?&]" + name + "=([^&#]*)";
	  var regex = new RegExp(regexS);
	  var results = regex.exec(window.location.href);
	  if(results == null)
	    return "";
	  else
	    return decodeURIComponent(results[1].replace(/\+/g, " "));
	}

	phoneui.submitForm = function(formId, button, urlToGoAfter) {
		var result = false;
		var form = document.forms(formId);
		if (form == null) return result;
				
    	var presubmitName = "preSubmitForm_" + form.name;
	    var method = $(form).attr('method');
	    var restype = $(form).attr('resulttype');
	    var str = $(form).serialize();
	    var path = $(form).attr('action');
	    var aftersubmitName = "postSubmitForm_" + form.name;
	
	    //validate non-empty path
	    if (!path) return false; //no path provided
	    //trim path
	    path = $.trim(path);
	    //validate non-empty path
	    if (path.length == 0) return false; //no path provided
	
	    if (presubmitName in phoneui) {
	      result = phoneui[presubmitName](form);
	      if (result == false) {
	        return result;
	      }
	    }  
	
	    //mailto: protocol issues on iOS:
	    // 1) fails on iOS3 standalone webapp
	    // 2) on iOS4 standalone webapp, the mail client does not return to webapp
	    if (path.indexOf('mailto:') > -1) {
	        $(form).attr('ENCTYPE','text/plain');
	        $(form)[0].submit();
	      
	        if (aftersubmitName in phoneui) {
	            result = phoneui[aftersubmitName](true);
	        }
	      
	        if (result && urlToGoAfter) {
	              setNewLocation(urlToGoAfter);
	        }
	      
	        return result;
	    }

		if (restype == 'WEB_PAGE') {
			// Pure Web submisson
			$(form)[0].submit();
			return;
		}
		
		phoneui.showActivityDialog();
		
		// "serverRedirectUrl"
		
		var redirect = getURIParameterByName('serverRedirectUrl');
		path += (method == "GET" ? ("?" + str) : "");
		
		var ajaxRequest = {
			type: method,
			url: (redirect || path),
			cache: false,
			beforeSend: function(xhr){
				if (redirect) {
					xhr.setRequestHeader("X-Original-http-address", path);
				}
				return true; //return false if execution should terminate
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
				console.log(textStatus, errorThrown);
				phoneui.hideActivityDialog();
				if (aftersubmitName in phoneui) {
					phoneui[aftersubmitName](false,textStatus);
				}			 
			},
			complete: function(xMLHttpRequest, textStatus) {
				// console.log(textStatus);
			},
			success: function(data) {
					result = true;

					if (aftersubmitName in phoneui) {
						result = phoneui[aftersubmitName](true, data);
					}
					
					if (result) {
						if (restype == 'DYNAMIC_PAGE') {
							var nextScreen = parseAnchor(urlToGoAfter);
							
							if (callPreTransition(nextScreen)) {
								loadPageCssAndJs(nextScreen, function() {
									parseDPIPageData(data);
	
									phoneui.hideActivityDialog();
	
									setNewLocation(urlToGoAfter);

									resizeScreen(nextScreen);

									var $next = $(nextScreen.anchor_id);
									animateNavigation( 
											$next, $(currentScreen.anchor_id), 
											nextScreen.transition, false, function() {
												nextScreen.time = currentScreen.time + 1;
												currentScreen = nextScreen;
												callPostTransition();												
									});
								});
							}
						} else {
							phoneui.hideActivityDialog();
							if (urlToGoAfter) {
								// only restype == 'DATA' should be here 							
								setNewLocation(urlToGoAfter);
							}
						}
					}
			}
		};
		if (method == "POST") {
			ajaxRequest['data'] = str;
		}	

		jQuery.ajax(ajaxRequest);	

		return result;
	}
	
	phoneui.gotoPage = function(pageId, transition) {
		var currentScreen = phoneui.getCurrentScreen();
		var newScreen = phoneui.getPageByAnchorId(pageId);
		if (newScreen == null) {
			console.log('Page ' + pageId + ' not found');
			return;
		}
		if (callPreTransition(newScreen)) {
			window.location.hash = newScreen.id + ":" + 
				(transition ? transition : phoneui.transitions.slideLeft) + 
				(currentScreen ? ":" + ((+currentScreen.time) + 1) : "");
		}
	}
	
	function animateNavigation($new, $old, transition, revertTransition, fnAfterTransition) {
		if(isSliding === false && ($new.attr('id') != $old.attr('id')))  {
			if ($new.length == 0) {
				return; // Target page is not found
			}

			var trNone = transition == 'NONE';
			var trFade = transition == 'FADE';
			var trFlipRight = transition == 'FLIP_LEFT';
			var trFlipLeft = transition == 'FLIP_RIGHT';
			var trSlideRight = transition == 'SLIDE_RIGHT';			
			var trSlideUp = transition == 'SLIDE_UP';
			var trSlideDown = transition == 'SLIDE_DOWN';
			var trSlideLeft = transition == 'SLIDE_LEFT' || transition == 'DEFAULT';
			
			isSliding = true;
			
			var afterTransition = function() {
				isSliding = false;
				fnAfterTransition();
			}

			var doAfterTransition = function($el, fn) {
				var performAfterTrans = function() {
					fn();
					$el.unbind('webkitAnimationEnd', performAfterTrans);
				}
				$el.bind('webkitAnimationEnd', performAfterTrans);
			}
			
			var doAfterFinalTransition = function($el, fn) {
				doAfterTransition($el, function() {
					fn();
					afterTransition();
				});
			}

			var cssIn = m1Design.css("in"); 
			var cssOut = m1Design.css("out");
			if (trFade) {
				var cssFade = m1Design.css("fade") + " " + cssIn;
				doAfterFinalTransition($new, function () { 
					$old.hide();
					$new.removeClass(cssFade);
				});
				$new .show().css({left: '0px'}).addClass(cssFade);
			} else if (trFlipRight || trFlipLeft) {
				var reverse = (trFlipLeft == revertTransition) ? (" " + m1Design.css("reverse")) : "";
				var cssFlip = m1Design.css("flip");
				$old .addClass(cssFlip + " " + cssOut + reverse);
	
				doAfterTransition($old, function() {
					$old.hide();
					$old.removeClass(cssFlip + " " + cssOut + reverse);
					doAfterFinalTransition($new, function() {
						$new .removeClass(cssFlip + " " + cssIn + reverse).css({left: '0'});
					});
					$new.show().css({left: '0'}).addClass(cssFlip + " " + cssIn + reverse);
				});
			} else if (trSlideRight || trSlideLeft) {
				var cssSlide = m1Design.css("slide");
				var reverse = (trSlideLeft == revertTransition) ? (" " + m1Design.css("reverse")) : "";
				doAfterFinalTransition($new, function() {
					$old.hide();
					$old.removeClass(cssSlide + " " + cssOut + reverse);
					$new.removeClass(cssSlide + " " + cssIn + reverse);
				});
				
				$old .addClass(cssSlide + " " + cssOut + reverse);
				$new .show().addClass(cssSlide + " " + cssIn + reverse);
			} else if (trSlideUp || trSlideDown) {
				var cssSlide = m1Design.css("slidev");
				var reverse = (trSlideUp == revertTransition) ? (" " + m1Design.css("reverse")) : "";
				doAfterFinalTransition($new, function() {
					$old.hide();
					$old.removeClass(cssSlide + " " + cssOut + reverse);
					$new.removeClass(cssSlide + " " + cssIn + reverse);
				});

				$old .addClass(cssSlide + " " + cssOut + reverse);
				$new .show().addClass(cssSlide + " " + cssIn + reverse);
			} else {
				// No animation for "NONE" transitions
				$old.hide();
				$new.css({left:'0px', display:'block'});
				// 0 timeout is required here, otherwise list item highlighting
				// won't work properly
				setTimeout(afterTransition, 0);
			}
		}
	};
	
	function reinitscrollers(root) {
		root.find('.' + m1Design.css("iscroll-scroller")).each(function() {
			var el = $(this).get(0);
			if (el.myScroll) {
				// Slightly delay scroll refresh to allow all elements re-calculate their sizes
				setTimeout(function() {
					el.myScroll.refresh();
				}, 100);
			}
		});
	}
	
	function setNewLocation(href) {
		if (href.match(/^#/)) {
			var nextScreen = parseAnchor(href);
			if (!nextScreen.equals(currentScreen)) {
				if (callPreTransition(nextScreen)) {
					// Add timestamp
					window.location = href + ":" + ((+currentScreen.time) + 1);
				}
			}
		} else if (href.match(/^sms:/i)) {
			// Special processing for SMS URL - they do not work in standalone mode
			// when set directly as window.location.href. So, we're implementing
			// workaround here
			var el = jQuery('<a href="' + href + '" style="position:absolute;"/>')
				.appendTo(document.body);
			var e = el[0];
			
			var evt = e.ownerDocument.createEvent('MouseEvents');
			evt.initMouseEvent('click', true, true, 
					e.ownerDocument.defaultView, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
			e.dispatchEvent(evt);
			el.remove();
		} else {
			window.location.href = href;
		}		
	}
	
	function unclickme($that) {
		if ($that.length > 0) {
			// Delaying "addClass(m1Design.css("unclicked"));" to 0 ms - because we can 
			// set "clicked" just in same message loop iteration. So we need to wait
			// until effect of "clicked" class appears, otherwise it won't look good.
			setTimeout(function() {
				// We shouldn't remove "clicked" just now, otherwise animations won't work
				$that.addClass(m1Design.css("unclicked"));
				// Delay dropping "clickable" for 100 ms, allow all effects to be drawn 
				setTimeout(function() {
					$that.removeClass(m1Design.css("unclicked")).removeClass(m1Design.css("clicked"));
				}, 150);
			}, 0);
		}
	}
	
	var timeMs = function() {
		return (new Date()).getTime();
	}

	// This function is called for each page to initialize it's controls
	var lastScrollTime = timeMs();

	function preProcess(context) {
		var clickeable = $('.' + m1Design.css("clickable"), context);
		
		$('.' + m1Design.css("iscroll-scroller"), context).each(function() {
			var el = $(this).get(0);

			if (!('myScroll' in el)) {
				el.myScroll = new iScroll(el, { 
					hScrollbar : false, 
					vScrollbar : true, 
					bounce: $(this).attr('data-bounce') == 'true',
					desktopCompatibility : true,
					shouldPreventDefault : function(el) {
						var clname = m1Design.css("iscroll-no-prevent-default");
						for (;el != document.body && !$(el).hasClass(clname);el = el.parentElement) {
						}
						return el == document.body;
					}, 
					onUserScroll : function(s) {
						lastScrollTime = timeMs();
					},
					onScrollStart : function() {
						clickeable = $('.' + m1Design.css("clickable"), context);

						// Vadim.Ridosh: I can't remove "filter", otherwise bouncing effect is broken.
						clickeable.filter("." + m1Design.css("unclicked")).removeClass(m1Design.css("unclicked"));
						clickeable.filter("." + m1Design.css("clicked")).removeClass(m1Design.css("clicked"));
					}
				});
			}
		});	

		var highlightClick = function($that) {
			$that.data('warmupStartTime', 0);
			$that.removeClass(m1Design.css("unclicked")).addClass(m1Design.css("clicked"));
		}
		
		var doClick = function($that) {
			var last = $that.data('lastClick');
			if (!last || (last + 300) < timeMs()) {
				$that.data('lastClick', timeMs());
				var href = $that.attr('href');
				setNewLocation(href);
			}
		}	

		// Support for elements that contain links but not clickable
		$('.' + m1Design.css("hyperlink") + ':not(' + '.' + m1Design.css("clickable") + ')', context).click(function(event) {
			event.preventDefault();
			event.stopPropagation();
			
			doClick($(this));
		});
	
		clickeable.bind((phoneui._platform.touchevents() ? "touchstart" : " mousedown"), function(event) {
			if (!isSliding && !(event.originalEvent && event.originalEvent.phoneuiprocessed)) {
				var $that = $(this); 
				if (!$that.data('warmupStartTime') || 
						(lastScrollTime >= + ($that.data('warmupStartTime')))) {
					$that.data('warmupStartTime', timeMs());
					setTimeout(function() {
						if (lastScrollTime <= $that.data('warmupStartTime')) {
							highlightClick($that);
						}
					}, 200);
				}

				if (event.originalEvent) {
					event.originalEvent.phoneuiprocessed = true;
				}
			}
		});
		
		clickeable.bind((phoneui._platform.touchevents() ? "touchcancel touchend" : "mouseleave mouseup"), function(event) {
			var click = event.type == "touchend" || event.type == "mouseup"; 
			var $that = $(this);
			if (!(event.originalEvent && event.originalEvent.phoneuiprocessed)) {
				if (click && (lastScrollTime <= +($that.data('warmupStartTime')))) {
					highlightClick($that);
				}

				if ($that.is("." + m1Design.css("clicked")) && !$that.is("." + m1Design.css("unclicked"))) {
					// special case below - list items with hyperlink will lose selection
					// only when we're returning back to the page
					if (!$that.is("." + m1Design.css("hyperlink-internal")) ||
						$that.is("." + m1Design.css("button"))) {
						unclickme($that);
						if (event.originalEvent) {
							event.originalEvent.phoneuiprocessed = true;
						}
		
						if ($that.is('.' + m1Design.css("selection-list") + ' > li[data-val]')) {
							tableListMngt($that);
						};
					}
	
					if (click && $that.is("." + m1Design.css("hyperlink"))) {
						doClick($that);
					}
				}
			}
		});

		var moveHiddenInputOverFake = function (el, fakeEl) {			
			var off = {left:0, top:0};
			for (var op = fakeEl; op != null; op = op.offsetParent) {
				off.left += op.offsetLeft;
				off.top += op.offsetTop;
				
				if (op.myScroll) {
					off.left += op.myScroll.x;
					off.top += op.myScroll.y;
				}
			}
			
			el.parentElement.style.left = off.left + "px";
			el.parentElement.style.top = off.top + "px";
		};
		
		// Support for "spinner mode" in SLM
		var processSLM = function(i, v) {	
			var sel = $("#" + $(v).attr("data-hiddenInputId"), context);
			var selInfoId = $("#" + $(v).attr("data-selectionInfoId"), context);
			if (selInfoId) {
				var onSelectionChange = function() {
					var labelsArray = [];
					var lis = sel.children('option');
					for(var i = 0; i < lis.length; i++) {
						var lbl = $(lis[i]);
						if (lbl.get(0).selected) {
							labelsArray.push(lbl.text());
						}
					}
					if ($(v).attr('data-multiple')=='false') {
						selInfoId.text(labelsArray[0]);
					} else {
						selInfoId.text("" + labelsArray.length);
					}
				}
	
				onSelectionChange();
				sel.unbind('change', onSelectionChange).bind('change', onSelectionChange);
				// For iOS4 support, subscribe to blur too 
				sel.unbind('blur', onSelectionChange).bind('blur', onSelectionChange);
				moveHiddenInputOverFake($(sel)[0], $(v)[0]);
			}
		};
		$('.' + m1Design.css('select-list-menu-spinner'), context).each(processSLM);
		$('.' + m1Design.css('select-list-menu'), context).each(processSLM);

		$('input select').bind('focus blur', function() {
			$('.' + m1Design.css('select-list-menu-spinner'), context).each(function(i, v) {	
				var sel = $("#" + $(v).attr("data-hiddenInputId"));			
				var el = sel.get(0);

				moveHiddenInputOverFake(el, $(v)[0]);
			});
		});
		
		$('.' + m1Design.css("select-list-menu-spinner"), context).click(function(e) {
			var sel = $("#" + $(this).attr("data-hiddenInputId"));
			var el = sel.get(0);

			moveHiddenInputOverFake(el, $(this)[0]);

			var evt = el.ownerDocument.createEvent('MouseEvents');
			evt.initMouseEvent('mousedown', true, true, el.ownerDocument.defaultView, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
			el.dispatchEvent(evt);
		});
		
		// End of support for "spinner mode" in SLM

		jQuery.each($('.' + m1Design.css("selection-list")), function(i, v) {
			processSelectionList(v);
		});
	}
	preProcess($('.' + m1Design.css("top-root")));
	
	phoneui.preprocessDOM = function(rootNode) {
		preProcess($(rootNode));
	}

	if ('documentReadyHandler' in phoneui) {
		phoneui.documentReadyHandler();
	} 
	
	function processSelectionList(elt) {
		var selInfoId = $("#" + $(elt).attr("data-selectionInfoId"));
		var labelsArray = [];
		var resultMap = {};
		var lis = $(elt).children('li[data-val]');
		for(var i = 0; i < lis.length; i++) {
			var lbl = $(lis[i]);
			if(lbl.hasClass(m1Design.css("selected"))) {
				resultMap[lbl.attr('data-val')] = true;
				if (selInfoId) {
					labelsArray.push(lbl.text());
				}
			}
		}
		var hiddenSel = $("#" + $(elt).attr("data-hiddenInputId"));
		
		// Update options states
		hiddenSel.children('option').each(function() {
			this.selected = resultMap[this.value];
		});		
		hiddenSel.trigger('change');		
		if (selInfoId) {
			if ($(elt).attr('data-multiple')=='false') {
				selInfoId.text(labelsArray[0]);
			} else {
				selInfoId.text("" + labelsArray.length);
			}
		}
	}
	
	function tableListMngt(item) {		
		var elt = $(item).closest('ul')[0];	 
		if($(elt).attr('data-multiple')=='false') {
			$(elt).children('li[data-val]').removeClass(m1Design.css("selected"));
			$(item).addClass(m1Design.css("selected"));
		} else {
			if ($(item).is("." + m1Design.css("selected"))) {
				$(item).removeClass(m1Design.css("selected"));
			} else {
				$(item).addClass(m1Design.css("selected"));
			}
		}
		processSelectionList(elt);
	}
			
	function SetCookie(sName, sValue) {
			document.cookie = sName + "=" + escape(sValue);
			var date = new Date();
			var expdate = date.getTime();
			expdate += 3600*1000 //expires (milliseconds - 1000 is for a day)
			date.setTime(expdate);
			document.cookie += ("; expires=" + date.toUTCString());
	}
	
	function GetCookie(sName) {
			var aCookie = document.cookie.split("; ");
			for (var i=0; i < aCookie.length; i++)
			{
					var aCrumb = aCookie[i].split("=");
					if (sName == aCrumb[0])
							return unescape(aCrumb[1]);
			}
			return null;
	}

	var cname = 'phc';
	var hsp = $('.' + m1Design.css('homescreen-prompt'));
	if(window.navigator.standalone != true && 
			!!window.navigator.userAgent.match(/(iphone|ipod|ipad)( simulator)?;/i)) {
		if(GetCookie(cname)) {
			// Hide the dialog box - to avoid scrolling
			hsp.hide();
		} else {
			// Show prompt dialog
			SetCookie(cname,'true');
			var s = phoneui._platform.docsize();
			var onipad = window.navigator.userAgent.toLowerCase().indexOf('ipad')!=-1;
			
			var canvas = hsp[0];
			var ctx = canvas.getContext("2d");
			var myImage = new Image();
			var top = onipad ? 40 : 30;
			var myIconLoaded = false;
			var myImageLoaded = false;
			myImage.onload = function() {
				myIconLoaded = true;
			};
			var myIcon = new Image();
			myIcon.onload = function() {
				myImageLoaded = true;
			};
			myImage.src = "res/images/homescreenPrompt.png";
			myIcon.src = "res/images/icon.png";

			var startCss = {opacity: '0.0'};
			var endCss = {opacity: '1.0'};
			if (onipad) {
				startCss['top'] = (- 100) + 'px';
				endCss['top'] = '0px';
				hsp.css({ left : '82px'});
			} else {
				startCss['top'] = (s.y - 20) + 'px';
				endCss['top'] = (s.y - 120) + 'px';
				hsp.css({ 'margin-left' : '-125px'});
			}
			hsp.css(startCss);

			var transitionF = function() {
				if (!myImageLoaded || !myIconLoaded) {
					setTimeout(transitionF, 50);
					return;
				}
				ctx.save();
				if (onipad) {
					ctx.translate(0, canvas.height);
				}
				ctx.scale(canvas.width/myImage.width, 
						(onipad ? -1 : 1)*canvas.height/myImage.height);
				ctx.drawImage(myImage, 0, 0);
				ctx.restore();
				ctx.font = "16px Helvetica";
				var t = ['Click button to', 'add this page to', 'your homescreen'];
				t.forEach(function (e, i) {
					ctx.fillText(e, 110, top + 10 + i * 20);	
				});

				ctx.drawImage(myIcon, 30, top);

				hsp .animate(
					endCss, 
					{duration: 400, complete: function() {
						setTimeout(function() { hsp .animate({opacity: '0'}, {
							duration:400,
							complete: function() { hsp .hide(); }
						})}, 5000);
					} }); 
			};
			setTimeout(transitionF, 0);
		}
	} else {
		hsp .hide();
	}
}); 

if (m1Design.shouldHideAddressBar) {
	window.addEventListener("load", function() {
		phoneui._platform.initAddressBarHiding();
	}, false);
}

document.addEventListener('DOMContentLoaded', function() {
	document.addEventListener('touchmove', function(e){ e.preventDefault(); });
});

/**
 * Page Transition Effects
 */
phoneui.transitions = {
	none : 'NONE',
	fade : 'FADE',
	flipRight : 'FLIP_RIGHT',
	flipLeft : 'FLIP_LEFT',
	slideRight : 'SLIDE_RIGHT',			
	slideLeft : 'SLIDE_LEFT'
};

/**
 * Navigate to page with transition effect
 *
 * @param pageId String 
 * @param transition, The phoneui.transitions visual effect 
 */
phoneui.gotoPage;

/**
 * Navigate to previous URL in history
 */
phoneui.back = function() {
	history.go(-1);
}

/**
 * Returns page object from passed anchorId (id of root HTML element for the page)
 */
phoneui.getPageByAnchorId = function(anchorId) {
	for (var p in m1Design.pages) {
		var page = m1Design.pages[p];
		if (page.anchor_id == anchorId || (page.anchor_id == ('#' + anchorId))) {
			return page;
		}
	}
	return null;
}

/**
 *  Show a small dialog composed of an animated graphic and an optional text 
 *  message. Use this function to indicate to the user that a potentially
 *  long running activity is underway, such as loading resources or waiting for
 *  computation to complete.
 *
 *  @param text option String message to show
 *  @see #hideActivityDialog
 */
phoneui.showActivityDialog = function (text) {
	if (!text && (text != "")) {
		text = "Loading..."; 
	}

	$('.' + m1Design.css('loading-text')) .html(text);

	if (!phoneui.showActivityDialog.controller) {
		var canvas = $('.' + m1Design.css("loading-spinner"))[0];
	
		var ctx = canvas.getContext("2d");
		var bars = 12;
		var currOffs = 0;
	
		function draw(ctx, offset) {
			clearFrame(ctx);
			ctx.save();
			ctx.translate(15, 15); // Center coordinates
			for(var i = 0; i<bars; i++){
				var cb = (offset+i) % bars;
				var angle = 2 * Math.PI * cb / bars;
	
				ctx.save();
				ctx.rotate(angle);
	
				var op = (1 + i)/bars;
				ctx.fillStyle = "rgba(255, 255, 255, " + op*op*op + ")";			
				ctx.fillRect(-1, 3, 2, 6);
	
				ctx.restore();
			}
			ctx.restore();
		}
		function clearFrame() {
			ctx.clearRect(0, 0, ctx.canvas.clientWidth, ctx.canvas.clientHeight);
		}
		function nextAnimation(){
			currOffs = (currOffs + 1) % bars;
			draw(ctx, currOffs);
		}
		phoneui.showActivityDialog.controller = {
			timer: -1,
			stop: function (){
				clearFrame();
				clearInterval(this.timer);
			},
			start: function (){
				this.timer = setInterval(nextAnimation, 80); // 20 fps
			}
		};
	}
	phoneui.showActivityDialog.controller.start();

	$('.' + m1Design.css('loading')) .show();
}

/**
 *  Terminate the activity dialog and remove it from the display. 
 *  This function is a NOP if the activity dialog is not already exposed.
 *
 *  @see #showActivityDialog
 */
phoneui.hideActivityDialog = function () {
	if (phoneui.showActivityDialog.controller) {
		phoneui.showActivityDialog.controller.stop();
	}
	$('.' + m1Design.css('loading')) .hide();
}

/**
 *  Should be called for each new DOM tree to pre-process elements
 *  (f.e. required for lists to have clickable behavior). Can be called
 *  only after document is loaded.
 */
phoneui.preprocessDOM;

/**
 * Returns true for standalone pages
 */
phoneui.isStandalone = function() {
	return "standalone" in window.navigator && window.navigator.standalone;
}

/**
 *  Current PhoneUI framework version info
 */
phoneui.version = { 
	major : 0, 
	minor : 1, 
	maintenance : 6, 
	toString : function() {
		return this.major + "." + this.minor + "." + this.maintenance;
	}
}