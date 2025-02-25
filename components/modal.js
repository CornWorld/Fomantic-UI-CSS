/*!
 * # Fomantic-UI 2.8.8 - Modal
 * http://github.com/fomantic/Fomantic-UI/
 *
 *
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ($, window, document, undefined) {

'use strict';

$.isFunction = $.isFunction || function(obj) {
  return typeof obj === "function" && typeof obj.nodeType !== "number";
};

window = (typeof window != 'undefined' && window.Math == Math)
  ? window
  : (typeof self != 'undefined' && self.Math == Math)
    ? self
    : Function('return this')()
;

$.fn.modal = function(parameters) {
  var
    $allModules    = $(this),
    $window        = $(window),
    $document      = $(document),
    $body          = $('body'),

    moduleSelector = $allModules.selector || '',

    time           = new Date().getTime(),
    performance    = [],

    query          = arguments[0],
    methodInvoked  = (typeof query == 'string'),
    queryArguments = [].slice.call(arguments, 1),

    requestAnimationFrame = window.requestAnimationFrame
      || window.mozRequestAnimationFrame
      || window.webkitRequestAnimationFrame
      || window.msRequestAnimationFrame
      || function(callback) { setTimeout(callback, 0); },

    returnedValue
  ;

  $allModules
    .each(function() {
      var
        settings    = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.modal.settings, parameters)
          : $.extend({}, $.fn.modal.settings),

        selector        = settings.selector,
        className       = settings.className,
        namespace       = settings.namespace,
        fields          = settings.fields,
        error           = settings.error,

        eventNamespace  = '.' + namespace,
        moduleNamespace = 'module-' + namespace,

        $module         = $(this),
        $context        = $(settings.context),
        $closeIcon      = $module.find(selector.closeIcon),
        $inputs,

        $allModals,
        $otherModals,
        $focusedElement,
        $dimmable,
        $dimmer,

        element         = this,
        instance        = $module.hasClass('modal') ? $module.data(moduleNamespace) : undefined,

        ignoreRepeatedEvents = false,

        initialMouseDownInModal,
        initialMouseDownInScrollbar,
        initialBodyMargin = '',
        tempBodyMargin = '',

        elementEventNamespace,
        id,
        observer,
        module
      ;
      module  = {

        initialize: function() {
          module.create.id();
          if(!$module.hasClass('modal')) {
            module.create.modal();
            if(!$.isFunction(settings.onHidden)) {
              settings.onHidden = function () {
                module.destroy();
                $module.remove();
              };
            }
          }
          $module.addClass(settings.class);
          if (settings.title !== '') {
            $module.find(selector.title).html(module.helpers.escape(settings.title, settings.preserveHTML)).addClass(settings.classTitle);
          }
          if (settings.content !== '') {
            $module.find(selector.content).html(module.helpers.escape(settings.content, settings.preserveHTML)).addClass(settings.classContent);
          }
          if(module.has.configActions()){
            var $actions = $module.find(selector.actions).addClass(settings.classActions);
            if ($actions.length === 0) {
              $actions = $('<div/>', {class: className.actions + ' ' + (settings.classActions || '')}).appendTo($module);
            } else {
              $actions.empty();
            }
            settings.actions.forEach(function (el) {
              var icon = el[fields.icon] ? '<i '+(el[fields.text] ? 'aria-hidden="true"' : '')+' class="' + module.helpers.deQuote(el[fields.icon]) + ' icon"></i>' : '',
                  text = module.helpers.escape(el[fields.text] || '', settings.preserveHTML),
                  cls = module.helpers.deQuote(el[fields.class] || ''),
                  click = el[fields.click] && $.isFunction(el[fields.click]) ? el[fields.click] : function () {};
              $actions.append($('<button/>', {
                html: icon + text,
                'aria-label': $('<div>'+(el[fields.text] || el[fields.icon] || '')+'</div>').text(),
                class: className.button + ' ' + cls,
                click: function () {
                  var button = $(this);
                  if (button.is(selector.approve) || button.is(selector.deny) || click.call(element, $module) === false) {
                    return;
                  }
                  module.hide();
                }
              }));
            });
          }
          module.cache = {};
          module.verbose('Initializing dimmer', $context);

          module.create.dimmer();

          if ( settings.allowMultiple ) {
            module.create.innerDimmer();
          }
          if (!settings.centered){
            $module.addClass('top aligned');
          }
          module.refreshModals();
          module.refreshInputs();
          module.bind.events();
          module.observeChanges();
          module.instantiate();
          if(settings.autoShow){
            module.show();
          }
        },

        instantiate: function() {
          module.verbose('Storing instance of modal');
          instance = module;
          $module
            .data(moduleNamespace, instance)
          ;
        },

        create: {
          modal: function() {
            $module = $('<div/>', {class: className.modal, role: 'dialog', 'aria-modal': true});
            if (settings.closeIcon) {
              $closeIcon = $('<i/>', {class: className.close, role: 'button', tabindex: 0, 'aria-label': settings.text.close})
              $module.append($closeIcon);
            }
            if (settings.title !== '') {
              var titleId = '_' + module.get.id() + 'title';
              $module.attr('aria-labelledby', titleId);
              $('<div/>', {class: className.title, id: titleId}).appendTo($module);
            }
            if (settings.content !== '') {
              var descId = '_' + module.get.id() + 'desc';
              $module.attr('aria-describedby', descId);
              $('<div/>', {class: className.content, id: descId}).appendTo($module);
            }
            if (module.has.configActions()) {
              $('<div/>', {class: className.actions}).appendTo($module);
            }
            $context.append($module);
          },
          dimmer: function() {
            var
              defaultSettings = {
                debug      : settings.debug,
                dimmerName : 'modals'
              },
              dimmerSettings = $.extend(true, defaultSettings, settings.dimmerSettings)
            ;
            if($.fn.dimmer === undefined) {
              module.error(error.dimmer);
              return;
            }
            module.debug('Creating dimmer');
            $dimmable = $context.dimmer(dimmerSettings);
            if(settings.detachable) {
              module.verbose('Modal is detachable, moving content into dimmer');
              $dimmable.dimmer('add content', $module);
            }
            else {
              module.set.undetached();
            }
            $dimmer = $dimmable.dimmer('get dimmer');
          },
          id: function() {
            id = (Math.random().toString(16) + '000000000').slice(2, 10);
            elementEventNamespace = '.' + id;
            module.verbose('Creating unique id for element', id);
          },
          innerDimmer: function() {
            if ( $module.find(selector.dimmer).length === 0 ) {
              $('<div/>', {class: className.innerDimmer}).prependTo($module);
            }
          }
        },

        destroy: function() {
          if (observer) {
            observer.disconnect();
          }
          module.verbose('Destroying previous modal');
          $module
            .removeData(moduleNamespace)
            .off(eventNamespace)
          ;
          $window.off(elementEventNamespace);
          $dimmer.off(elementEventNamespace);
          $closeIcon.off(elementEventNamespace);
          if($inputs) {
            $inputs.off(elementEventNamespace);
          }
          $context.dimmer('destroy');
        },

        observeChanges: function() {
          if('MutationObserver' in window) {
            observer = new MutationObserver(function(mutations) {
              if(settings.observeChanges) {
                module.debug('DOM tree modified, refreshing');
                module.refresh();
              }
              module.refreshInputs();
            });
            observer.observe(element, {
              childList : true,
              subtree   : true
            });
            module.debug('Setting up mutation observer', observer);
          }
        },

        refresh: function() {
          module.remove.scrolling();
          module.cacheSizes();
          if(!module.can.useFlex()) {
            module.set.modalOffset();
          }
          module.set.screenHeight();
          module.set.type();
        },

        refreshModals: function() {
          $otherModals = $module.siblings(selector.modal);
          $allModals   = $otherModals.add($module);
        },

        refreshInputs: function(){
          if($inputs){
            $inputs
              .off('keydown' + elementEventNamespace)
            ;
          }
          $inputs    = $module.find('[tabindex], :input').filter(':visible').filter(function() {
            return $(this).closest('.disabled').length === 0;
          });
          $inputs.first()
              .on('keydown' + elementEventNamespace, module.event.inputKeyDown.first)
          ;
          $inputs.last()
              .on('keydown' + elementEventNamespace, module.event.inputKeyDown.last)
          ;
        },

        attachEvents: function(selector, event) {
          var
            $toggle = $(selector)
          ;
          event = $.isFunction(module[event])
            ? module[event]
            : module.toggle
          ;
          if($toggle.length > 0) {
            module.debug('Attaching modal events to element', selector, event);
            $toggle
              .off(eventNamespace)
              .on('click' + eventNamespace, event)
            ;
          }
          else {
            module.error(error.notFound, selector);
          }
        },

        bind: {
          events: function() {
            module.verbose('Attaching events');
            $module
              .on('click' + eventNamespace, selector.close, module.event.close)
              .on('click' + eventNamespace, selector.approve, module.event.approve)
              .on('click' + eventNamespace, selector.deny, module.event.deny)
            ;
            $closeIcon
                .on('keyup' + elementEventNamespace, module.event.closeKeyUp)
            ;
            $window
              .on('resize' + elementEventNamespace, module.event.resize)
            ;
          },
          scrollLock: function() {
            // touch events default to passive, due to changes in chrome to optimize mobile perf
            $dimmable.get(0).addEventListener('touchmove', module.event.preventScroll, { passive: false });
          }
        },

        unbind: {
          scrollLock: function() {
            $dimmable.get(0).removeEventListener('touchmove', module.event.preventScroll, { passive: false });
          }
        },

        get: {
          id: function() {
            return id;
          },
          element: function() {
            return $module;
          },
          settings: function() {
            return settings;
          }
        },

        event: {
          approve: function() {
            if(ignoreRepeatedEvents || settings.onApprove.call(element, $(this)) === false) {
              module.verbose('Approve callback returned false cancelling hide');
              return;
            }
            ignoreRepeatedEvents = true;
            module.hide(function() {
              ignoreRepeatedEvents = false;
            });
          },
          preventScroll: function(event) {
            if(event.target.className.indexOf('dimmer') !== -1) {
              event.preventDefault();
            }
          },
          deny: function() {
            if(ignoreRepeatedEvents || settings.onDeny.call(element, $(this)) === false) {
              module.verbose('Deny callback returned false cancelling hide');
              return;
            }
            ignoreRepeatedEvents = true;
            module.hide(function() {
              ignoreRepeatedEvents = false;
            });
          },
          close: function() {
            module.hide();
          },
          closeKeyUp: function(event){
            var
              keyCode   = event.which
            ;
            if ((keyCode === settings.keys.enter || keyCode === settings.keys.space) && $module.hasClass(className.front)) {
              module.hide();
            }
          },
          inputKeyDown: {
            first: function(event) {
              var
                  keyCode = event.which
              ;
              if (keyCode === settings.keys.tab && event.shiftKey) {
                $inputs.last().focus();
                event.preventDefault();
              }
            },
            last: function(event) {
              var
                  keyCode = event.which
              ;
              if (keyCode === settings.keys.tab && !event.shiftKey) {
                $inputs.first().focus();
                event.preventDefault();
              }
            }
          },
          mousedown: function(event) {
            var
              $target   = $(event.target),
              isRtl = module.is.rtl()
            ;
            initialMouseDownInModal = ($target.closest(selector.modal).length > 0);
            if(initialMouseDownInModal) {
              module.verbose('Mouse down event registered inside the modal');
            }
            initialMouseDownInScrollbar = module.is.scrolling() && ((!isRtl && $(window).outerWidth() - settings.scrollbarWidth <= event.clientX) || (isRtl && settings.scrollbarWidth >= event.clientX));
            if(initialMouseDownInScrollbar) {
              module.verbose('Mouse down event registered inside the scrollbar');
            }
          },
          mouseup: function(event) {
            if(!settings.closable) {
              module.verbose('Dimmer clicked but closable setting is disabled');
              return;
            }
            if(initialMouseDownInModal) {
              module.debug('Dimmer clicked but mouse down was initially registered inside the modal');
              return;
            }
            if(initialMouseDownInScrollbar){
              module.debug('Dimmer clicked but mouse down was initially registered inside the scrollbar');
              return;
            }
            var
              $target   = $(event.target),
              isInModal = ($target.closest(selector.modal).length > 0),
              isInDOM   = $.contains(document.documentElement, event.target)
            ;
            if(!isInModal && isInDOM && module.is.active() && $module.hasClass(className.front) ) {
              module.debug('Dimmer clicked, hiding all modals');
              if(settings.allowMultiple) {
                if(!module.hideAll()) {
                  return;
                }
              }
              else if(!module.hide()){
                  return;
              }
              module.remove.clickaway();
            }
          },
          debounce: function(method, delay) {
            clearTimeout(module.timer);
            module.timer = setTimeout(method, delay);
          },
          keyboard: function(event) {
            var
              keyCode   = event.which
            ;
            if(keyCode === settings.keys.escape) {
              if(settings.closable) {
                module.debug('Escape key pressed hiding modal');
                if ( $module.hasClass(className.front) ) {
                  module.hide();
                }
              }
              else {
                module.debug('Escape key pressed, but closable is set to false');
              }
              event.preventDefault();
            }
          },
          resize: function() {
            if( $dimmable.dimmer('is active') && ( module.is.animating() || module.is.active() ) ) {
              requestAnimationFrame(module.refresh);
            }
          }
        },

        toggle: function() {
          if( module.is.active() || module.is.animating() ) {
            module.hide();
          }
          else {
            module.show();
          }
        },

        show: function(callback) {
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          module.refreshModals();
          module.set.dimmerSettings();
          module.set.dimmerStyles();

          module.showModal(callback);
        },

        hide: function(callback) {
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          module.refreshModals();
          return module.hideModal(callback);
        },

        showModal: function(callback) {
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          if( module.is.animating() || !module.is.active() ) {
            if(settings.onShow.call(element) === false) {
              module.verbose('Show callback returned false cancelling show');
              return;
            }
            module.showDimmer();
            module.cacheSizes();
            module.set.bodyMargin();
            if(module.can.useFlex()) {
              module.remove.legacy();
            }
            else {
              module.set.legacy();
              module.set.modalOffset();
              module.debug('Using non-flex legacy modal positioning.');
            }
            module.set.screenHeight();
            module.set.type();
            module.set.clickaway();

            if( !settings.allowMultiple && module.others.active() ) {
              module.hideOthers(module.showModal);
            }
            else {
              ignoreRepeatedEvents = false;
              if( settings.allowMultiple ) {
                if ( module.others.active() ) {
                  $otherModals.filter('.' + className.active).find(selector.dimmer).addClass('active');
                }

                if ( settings.detachable ) {
                  $module.detach().appendTo($dimmer);
                }
              }
              if(settings.transition && $.fn.transition !== undefined && $module.transition('is supported')) {
                module.debug('Showing modal with css animations');
                $module
                  .transition({
                    debug       : settings.debug,
                    animation   : (settings.transition.showMethod || settings.transition) + ' in',
                    queue       : settings.queue,
                    duration    : settings.transition.showDuration || settings.duration,
                    useFailSafe : true,
                    onComplete : function() {
                      settings.onVisible.apply(element);
                      if(settings.keyboardShortcuts) {
                        module.add.keyboardShortcuts();
                      }
                      module.save.focus();
                      module.set.active();
                      if(settings.autofocus) {
                        module.set.autofocus();
                      }
                      callback();
                    }
                  })
                ;
              }
              else {
                module.error(error.noTransition);
              }
            }
          }
          else {
            module.debug('Modal is already visible');
          }
        },

        hideModal: function(callback, keepDimmed, hideOthersToo) {
          var
            $previousModal = $otherModals.filter('.' + className.active).last()
          ;
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          if(settings.onHide.call(element, $(this)) === false) {
            module.verbose('Hide callback returned false cancelling hide');
            ignoreRepeatedEvents = false;
            return false;
          }

          if( module.is.animating() || module.is.active() ) {
            module.debug('Hiding modal');
            if(settings.transition && $.fn.transition !== undefined && $module.transition('is supported')) {
              module.remove.active();
              $module
                .transition({
                  debug       : settings.debug,
                  animation   : (settings.transition.hideMethod || settings.transition) + ' out',
                  queue       : settings.queue,
                  duration    : settings.transition.hideDuration || settings.duration,
                  useFailSafe : true,
                  onStart     : function() {
                    if(!module.others.active() && !module.others.animating() && !keepDimmed) {
                      module.hideDimmer();
                    }
                    if( settings.keyboardShortcuts && !module.others.active() ) {
                      module.remove.keyboardShortcuts();
                    }
                  },
                  onComplete : function() {
                    module.unbind.scrollLock();
                    if ( settings.allowMultiple ) {
                      $previousModal.addClass(className.front);
                      $module.removeClass(className.front);

                      if ( hideOthersToo ) {
                        $allModals.find(selector.dimmer).removeClass('active');
                      }
                      else {
                        $previousModal.find(selector.dimmer).removeClass('active');
                      }
                    }
                    if($.isFunction(settings.onHidden)) {
                      settings.onHidden.call(element);
                    }
                    module.remove.dimmerStyles();
                    module.restore.focus();
                    callback();
                  }
                })
              ;
            }
            else {
              module.error(error.noTransition);
            }
          }
        },

        showDimmer: function() {
          if($dimmable.dimmer('is animating') || !$dimmable.dimmer('is active') ) {
            module.save.bodyMargin();
            module.debug('Showing dimmer');
            $dimmable.dimmer('show');
          }
          else {
            module.debug('Dimmer already visible');
          }
        },

        hideDimmer: function() {
          if( $dimmable.dimmer('is animating') || ($dimmable.dimmer('is active')) ) {
            module.unbind.scrollLock();
            $dimmable.dimmer('hide', function() {
              module.restore.bodyMargin();
              module.remove.clickaway();
              module.remove.screenHeight();
            });
          }
          else {
            module.debug('Dimmer is not visible cannot hide');
            return;
          }
        },

        hideAll: function(callback) {
          var
            $visibleModals = $allModals.filter('.' + className.active + ', .' + className.animating)
          ;
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          if( $visibleModals.length > 0 ) {
            module.debug('Hiding all visible modals');
            var hideOk = true;
//check in reverse order trying to hide most top displayed modal first
            $($visibleModals.get().reverse()).each(function(index,element){
                if(hideOk){
                    hideOk = $(element).modal('hide modal', callback, false, true);
                }
            });
            if(hideOk) {
              module.hideDimmer();
            }
            return hideOk;
          }
        },

        hideOthers: function(callback) {
          var
            $visibleModals = $otherModals.filter('.' + className.active + ', .' + className.animating)
          ;
          callback = $.isFunction(callback)
            ? callback
            : function(){}
          ;
          if( $visibleModals.length > 0 ) {
            module.debug('Hiding other modals', $otherModals);
            $visibleModals
              .modal('hide modal', callback, true)
            ;
          }
        },

        others: {
          active: function() {
            return ($otherModals.filter('.' + className.active).length > 0);
          },
          animating: function() {
            return ($otherModals.filter('.' + className.animating).length > 0);
          }
        },


        add: {
          keyboardShortcuts: function() {
            module.verbose('Adding keyboard shortcuts');
            $document
              .on('keyup' + eventNamespace, module.event.keyboard)
            ;
          }
        },

        save: {
          focus: function() {
            var
              $activeElement = $(document.activeElement),
              inCurrentModal = $activeElement.closest($module).length > 0
            ;
            if(!inCurrentModal) {
              $focusedElement = $(document.activeElement).blur();
            }
          },
          bodyMargin: function() {
            initialBodyMargin = $body.css('margin-'+(module.can.leftBodyScrollbar() ? 'left':'right'));
            var bodyMarginRightPixel = parseInt(initialBodyMargin.replace(/[^\d.]/g, '')),
                bodyScrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            tempBodyMargin = bodyMarginRightPixel + bodyScrollbarWidth;
          }
        },

        restore: {
          focus: function() {
            if($focusedElement && $focusedElement.length > 0 && settings.restoreFocus) {
              $focusedElement.focus();
            }
          },
          bodyMargin: function() {
            var position = module.can.leftBodyScrollbar() ? 'left':'right';
            $body.css('margin-'+position, initialBodyMargin);
            $body.find(selector.bodyFixed.replace('right',position)).each(function(){
              var el = $(this),
                  attribute = el.css('position') === 'fixed' ? 'padding-'+position : position
              ;
              el.css(attribute, '');
            });
          }
        },

        remove: {
          active: function() {
            $module.removeClass(className.active);
          },
          legacy: function() {
            $module.removeClass(className.legacy);
          },
          clickaway: function() {
            if (!settings.detachable) {
              $module
                  .off('mousedown' + elementEventNamespace)
              ;
            }
            $dimmer
              .off('mousedown' + elementEventNamespace)
            ;
            $dimmer
              .off('mouseup' + elementEventNamespace)
            ;
          },
          dimmerStyles: function() {
            $dimmer.removeClass(className.inverted);
            $dimmable.removeClass(className.blurring);
          },
          bodyStyle: function() {
            if($body.attr('style') === '') {
              module.verbose('Removing style attribute');
              $body.removeAttr('style');
            }
          },
          screenHeight: function() {
            module.debug('Removing page height');
            $body
              .css('height', '')
            ;
          },
          keyboardShortcuts: function() {
            module.verbose('Removing keyboard shortcuts');
            $document
              .off('keyup' + eventNamespace)
            ;
          },
          scrolling: function() {
            $dimmable.removeClass(className.scrolling);
            $module.removeClass(className.scrolling);
          }
        },

        cacheSizes: function() {
          $module.addClass(className.loading);
          var
            scrollHeight = $module.prop('scrollHeight'),
            modalWidth   = $module.outerWidth(),
            modalHeight  = $module.outerHeight()
          ;
          if(module.cache.pageHeight === undefined || modalHeight !== 0) {
            $.extend(module.cache, {
              pageHeight    : $(document).outerHeight(),
              width         : modalWidth,
              height        : modalHeight + settings.offset,
              scrollHeight  : scrollHeight + settings.offset,
              contextHeight : (settings.context == 'body')
                ? $(window).height()
                : $dimmable.height(),
            });
            module.cache.topOffset = -(module.cache.height / 2);
          }
          $module.removeClass(className.loading);
          module.debug('Caching modal and container sizes', module.cache);
        },
        helpers: {
          deQuote: function(string) {
            return String(string).replace(/"/g,"");
          },
          escape: function(string, preserveHTML) {
            if (preserveHTML){
              return string;
            }
            var
                badChars     = /[<>"'`]/g,
                shouldEscape = /[&<>"'`]/,
                escape       = {
                  "<": "&lt;",
                  ">": "&gt;",
                  '"': "&quot;",
                  "'": "&#x27;",
                  "`": "&#x60;"
                },
                escapedChar  = function(chr) {
                  return escape[chr];
                }
            ;
            if(shouldEscape.test(string)) {
              string = string.replace(/&(?![a-z0-9#]{1,6};)/, "&amp;");
              return string.replace(badChars, escapedChar);
            }
            return string;
          }
        },
        can: {
          leftBodyScrollbar: function(){
            if(module.cache.leftBodyScrollbar === undefined) {
              module.cache.leftBodyScrollbar = module.is.rtl() && ((module.is.iframe && !module.is.firefox()) || module.is.safari() || module.is.edge() || module.is.ie());
            }
            return module.cache.leftBodyScrollbar;
          },
          useFlex: function() {
            if (settings.useFlex === 'auto') {
              return settings.detachable && !module.is.ie();
            }
            if(settings.useFlex && module.is.ie()) {
              module.debug('useFlex true is not supported in IE');
            } else if(settings.useFlex && !settings.detachable) {
              module.debug('useFlex true in combination with detachable false is not supported');
            }
            return settings.useFlex;
          },
          fit: function() {
            var
              contextHeight  = module.cache.contextHeight,
              verticalCenter = module.cache.contextHeight / 2,
              topOffset      = module.cache.topOffset,
              scrollHeight   = module.cache.scrollHeight,
              height         = module.cache.height,
              paddingHeight  = settings.padding,
              startPosition  = (verticalCenter + topOffset)
            ;
            return (scrollHeight > height)
              ? (startPosition + scrollHeight + paddingHeight < contextHeight)
              : (height + (paddingHeight * 2) < contextHeight)
            ;
          }
        },
        has: {
          configActions: function () {
            return Array.isArray(settings.actions) && settings.actions.length > 0;
          }
        },
        is: {
          active: function() {
            return $module.hasClass(className.active);
          },
          ie: function() {
            if(module.cache.isIE === undefined) {
              var
                  isIE11 = (!(window.ActiveXObject) && 'ActiveXObject' in window),
                  isIE = ('ActiveXObject' in window)
              ;
              module.cache.isIE = (isIE11 || isIE);
            }
            return module.cache.isIE;
          },
          animating: function() {
            return $module.transition('is supported')
              ? $module.transition('is animating')
              : $module.is(':visible')
            ;
          },
          scrolling: function() {
            return $dimmable.hasClass(className.scrolling);
          },
          modernBrowser: function() {
            // appName for IE11 reports 'Netscape' can no longer use
            return !(window.ActiveXObject || 'ActiveXObject' in window);
          },
          rtl: function() {
            if(module.cache.isRTL === undefined) {
              module.cache.isRTL = $body.attr('dir') === 'rtl' || $body.css('direction') === 'rtl';
            }
            return module.cache.isRTL;
          },
          safari: function() {
            if(module.cache.isSafari === undefined) {
              module.cache.isSafari = /constructor/i.test(window.HTMLElement) || !!window.ApplePaySession;
            }
            return module.cache.isSafari;
          },
          edge: function(){
            if(module.cache.isEdge === undefined) {
              module.cache.isEdge = !!window.setImmediate && !module.is.ie();
            }
            return module.cache.isEdge;
          },
          firefox: function(){
            if(module.cache.isFirefox === undefined) {
                module.cache.isFirefox = !!window.InstallTrigger;
            }
            return module.cache.isFirefox;
          },
          iframe: function() {
              return !(self === top);
          }
        },

        set: {
          autofocus: function() {
            var
              $autofocus = $inputs.filter('[autofocus]'),
              $input     = ($autofocus.length > 0)
                ? $autofocus.first()
                : ($inputs.length > 1 ? $inputs.filter(':not(i.close)') : $inputs).first()
            ;
            if($input.length > 0) {
              $input.focus();
            }
          },
          bodyMargin: function() {
            var position = module.can.leftBodyScrollbar() ? 'left':'right';
            if(settings.detachable || module.can.fit()) {
              $body.css('margin-'+position, tempBodyMargin + 'px');
            }
            $body.find(selector.bodyFixed.replace('right',position)).each(function(){
              var el = $(this),
                  attribute = el.css('position') === 'fixed' ? 'padding-'+position : position
              ;
              el.css(attribute, 'calc(' + el.css(attribute) + ' + ' + tempBodyMargin + 'px)');
            });
          },
          clickaway: function() {
            if (!settings.detachable) {
              $module
                .on('mousedown' + elementEventNamespace, module.event.mousedown)
              ;
            }
            $dimmer
              .on('mousedown' + elementEventNamespace, module.event.mousedown)
            ;
            $dimmer
              .on('mouseup' + elementEventNamespace, module.event.mouseup)
            ;
          },
          dimmerSettings: function() {
            if($.fn.dimmer === undefined) {
              module.error(error.dimmer);
              return;
            }
            var
              defaultSettings = {
                debug      : settings.debug,
                dimmerName : 'modals',
                closable   : 'auto',
                useFlex    : module.can.useFlex(),
                duration   : {
                  show     : settings.transition.showDuration || settings.duration,
                  hide     : settings.transition.hideDuration || settings.duration
                }
              },
              dimmerSettings = $.extend(true, defaultSettings, settings.dimmerSettings)
            ;
            if(settings.inverted) {
              dimmerSettings.variation = (dimmerSettings.variation !== undefined)
                ? dimmerSettings.variation + ' inverted'
                : 'inverted'
              ;
            }
            $context.dimmer('setting', dimmerSettings);
          },
          dimmerStyles: function() {
            if(settings.inverted) {
              $dimmer.addClass(className.inverted);
            }
            else {
              $dimmer.removeClass(className.inverted);
            }
            if(settings.blurring) {
              $dimmable.addClass(className.blurring);
            }
            else {
              $dimmable.removeClass(className.blurring);
            }
          },
          modalOffset: function() {
            if (!settings.detachable) {
              var canFit = module.can.fit();
              $module
                .css({
                  top: (!$module.hasClass('aligned') && canFit)
                    ? $(document).scrollTop() + (module.cache.contextHeight - module.cache.height) / 2
                    : !canFit || $module.hasClass('top')
                      ? $(document).scrollTop() + settings.padding
                      : $(document).scrollTop() + (module.cache.contextHeight - module.cache.height - settings.padding),
                  marginLeft: -(module.cache.width / 2)
                })
              ;
            } else {
              $module
                .css({
                  marginTop: (!$module.hasClass('aligned') && module.can.fit())
                    ? -(module.cache.height / 2)
                    : settings.padding / 2,
                  marginLeft: -(module.cache.width / 2)
                })
              ;
            }
            module.verbose('Setting modal offset for legacy mode');
          },
          screenHeight: function() {
            if( module.can.fit() ) {
              $body.css('height', '');
            }
            else if(!$module.hasClass('bottom')) {
              module.debug('Modal is taller than page content, resizing page height');
              $body
                .css('height', module.cache.height + (settings.padding * 2) )
              ;
            }
          },
          active: function() {
            $module.addClass(className.active + ' ' + className.front);
            $otherModals.filter('.' + className.active).removeClass(className.front);
          },
          scrolling: function() {
            $dimmable.addClass(className.scrolling);
            $module.addClass(className.scrolling);
            module.unbind.scrollLock();
          },
          legacy: function() {
            $module.addClass(className.legacy);
          },
          type: function() {
            if(module.can.fit()) {
              module.verbose('Modal fits on screen');
              if(!module.others.active() && !module.others.animating()) {
                module.remove.scrolling();
                module.bind.scrollLock();
              }
            }
            else if (!$module.hasClass('bottom')){
              module.verbose('Modal cannot fit on screen setting to scrolling');
              module.set.scrolling();
            } else {
                module.verbose('Bottom aligned modal not fitting on screen is unsupported for scrolling');
            }
          },
          undetached: function() {
            $dimmable.addClass(className.undetached);
          }
        },

        setting: function(name, value) {
          module.debug('Changing setting', name, value);
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            if($.isPlainObject(settings[name])) {
              $.extend(true, settings[name], value);
            }
            else {
              settings[name] = value;
            }
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(!settings.silent && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(!settings.silent && settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          if(!settings.silent) {
            module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
            module.error.apply(console, arguments);
          }
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if(Array.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };

      if(methodInvoked) {
        if(instance === undefined) {
          if ($.isFunction(settings.templates[query])) {
            settings.autoShow = true;
            settings.className.modal = settings.className.template;
            settings = $.extend(true, {}, settings, settings.templates[query].apply(module ,queryArguments));

            // reassign shortcuts
            className = settings.className;
            namespace = settings.namespace;
            fields    = settings.fields;
            error     = settings.error;
          }
          module.initialize();
        }
        if (!$.isFunction(settings.templates[query])) {
          module.invoke(query);
        }
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
        returnedValue = $module;
      }
    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.modal.settings = {

  name           : 'Modal',
  namespace      : 'modal',

  useFlex        : 'auto',
  offset         : 0,

  silent         : false,
  debug          : false,
  verbose        : false,
  performance    : true,

  observeChanges : false,

  allowMultiple  : false,
  detachable     : true,
  closable       : true,
  autofocus      : true,
  restoreFocus   : true,
  autoShow       : false,

  inverted       : false,
  blurring       : false,

  centered       : true,

  dimmerSettings : {
    closable : false,
    useCSS   : true
  },

  // whether to use keyboard shortcuts
  keyboardShortcuts: true,

  context    : 'body',

  queue      : false,
  duration   : 500,
  transition : 'scale',

  // padding with edge of page
  padding    : 50,
  scrollbarWidth: 10,

  //dynamic content
  title        : '',
  content      : '',
  class        : '',
  classTitle   : '',
  classContent : '',
  classActions : '',
  closeIcon    : false,
  actions      : false,
  preserveHTML : true,

  fields         : {
    class        : 'class',
    text         : 'text',
    icon         : 'icon',
    click        : 'click'
  },

  // called before show animation
  onShow     : function(){},

  // called after show animation
  onVisible  : function(){},

  // called before hide animation
  onHide     : function(){ return true; },

  // called after hide animation
  onHidden   : false,

  // called after approve selector match
  onApprove  : function(){ return true; },

  // called after deny selector match
  onDeny     : function(){ return true; },

  keys : {
    space      : 32,
    enter      : 13,
    escape     : 27,
    tab        :  9,
  },

  selector    : {
    title    : '> .header',
    content  : '> .content',
    actions  : '> .actions',
    close    : '> .close',
    closeIcon: '> .close',
    approve  : '.actions .positive, .actions .approve, .actions .ok',
    deny     : '.actions .negative, .actions .deny, .actions .cancel',
    modal    : '.ui.modal',
    dimmer   : '> .ui.dimmer',
    bodyFixed: '> .ui.fixed.menu, > .ui.right.toast-container, > .ui.right.sidebar, > .ui.fixed.nag, > .ui.fixed.nag > .close',
    prompt   : '.ui.input > input'
  },
  error : {
    dimmer    : 'UI Dimmer, a required component is not included in this page',
    method    : 'The method you called is not defined.',
    notFound  : 'The element you specified could not be found'
  },
  className : {
    active     : 'active',
    animating  : 'animating',
    blurring   : 'blurring',
    inverted   : 'inverted',
    legacy     : 'legacy',
    loading    : 'loading',
    scrolling  : 'scrolling',
    undetached : 'undetached',
    front      : 'front',
    close      : 'close icon',
    button     : 'ui button',
    modal      : 'ui modal',
    title      : 'header',
    content    : 'content',
    actions    : 'actions',
    template   : 'ui tiny modal',
    ok         : 'positive',
    cancel     : 'negative',
    prompt     : 'ui fluid input',
    innerDimmer: 'ui inverted dimmer'
  },
  text: {
    ok    : 'Ok',
    cancel: 'Cancel',
    close : 'Close'
  }
};

$.fn.modal.settings.templates = {
  getArguments: function(args) {
    var queryArguments = [].slice.call(args);
    if($.isPlainObject(queryArguments[0])){
      return $.extend({
        handler:function(){},
        content:'',
        title: ''
      }, queryArguments[0]);
    } else {
      if(!$.isFunction(queryArguments[queryArguments.length-1])) {
        queryArguments.push(function() {});
      }
      return {
        handler: queryArguments.pop(),
        content: queryArguments.pop() || '',
        title: queryArguments.pop() || ''
      };
    }
  },
  alert: function () {
    var settings = this.get.settings(),
        args     = settings.templates.getArguments(arguments),
        approveFn = args.handler
    ;
    return {
      title  : args.title,
      content: args.content,
      onApprove: approveFn,
      actions: [{
        text : settings.text.ok,
        class: settings.className.ok,
        click: approveFn
      }]
    }
  },
  confirm: function () {
    var settings = this.get.settings(),
        args     = settings.templates.getArguments(arguments),
        approveFn = function(){args.handler(true)},
        denyFn = function(){args.handler(false)}
    ;
    return {
      title  : args.title,
      content: args.content,
      onApprove: approveFn,
      onDeny: denyFn,
      actions: [{
        text : settings.text.ok,
        class: settings.className.ok,
        click: approveFn
      },{
        text: settings.text.cancel,
        class: settings.className.cancel,
        click: denyFn
      }]
    }
  },
  prompt: function () {
    var $this    = this,
        settings = this.get.settings(),
        args     = settings.templates.getArguments(arguments),
        input    = $($.parseHTML(args.content)).filter('.ui.input'),
        approveFn = function(){
          var settings = $this.get.settings(),
              inputField = $this.get.element().find(settings.selector.prompt)[0]
          ;
          args.handler($(inputField).val());
        },
        denyFn = function(){args.handler(null)}
    ;
    if (input.length === 0) {
      args.content += '<p><div class="'+settings.className.prompt+'"><input placeholder="'+this.helpers.deQuote(args.placeholder || '')+'" type="text" value="'+this.helpers.deQuote(args.defaultValue || '')+'"></div></p>';
    }
    return {
      title  : args.title,
      content: args.content,
      onApprove: approveFn,
      onDeny: denyFn,
      actions: [{
        text: settings.text.ok,
        class: settings.className.ok,
        click:  approveFn
      },{
        text: settings.text.cancel,
        class: settings.className.cancel,
        click: denyFn
      }]
    }
  }
}

})( jQuery, window, document );
