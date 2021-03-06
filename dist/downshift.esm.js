import React, { Component } from 'react';
import PropTypes from 'prop-types';

// istanbul ignore next
var statusDiv = typeof document === 'undefined' ? null : document.getElementById('a11y-status-message');

var statuses = [];

function setStatus(status) {
  var isSameAsLast = statuses[statuses.length - 1] === status;
  if (isSameAsLast) {
    statuses = [].concat(statuses, [status]);
  } else {
    statuses = [status];
  }
  var div = getStatusDiv();

  // Remove previous children
  while (div.lastChild) {
    div.removeChild(div.firstChild);
  }

  statuses.filter(Boolean).forEach(function (statusItem, index) {
    div.appendChild(getStatusChildDiv(statusItem, index));
  });
}

function getStatusChildDiv(status, index) {
  var display = index === statuses.length - 1 ? 'block' : 'none';

  var childDiv = document.createElement('div');
  childDiv.style.display = display;
  childDiv.textContent = status;

  return childDiv;
}

function getStatusDiv() {
  if (statusDiv) {
    return statusDiv;
  }
  statusDiv = document.createElement('div');
  statusDiv.setAttribute('id', 'a11y-status-message');
  statusDiv.setAttribute('role', 'status');
  statusDiv.setAttribute('aria-live', 'assertive');
  statusDiv.setAttribute('aria-relevant', 'additions text');
  Object.assign(statusDiv.style, {
    border: '0',
    clip: 'rect(0 0 0 0)',
    height: '1px',
    margin: '-1px',
    overflow: 'hidden',
    padding: '0',
    position: 'absolute',
    width: '1px'
  });
  document.body.appendChild(statusDiv);
  return statusDiv;
}

var idCounter = 0;

/**
 * Accepts a parameter and returns it if it's a function
 * or a noop function if it's not. This allows us to
 * accept a callback, but not worry about it if it's not
 * passed.
 * @param {Function} cb the callback
 * @return {Function} a function
 */
function cbToCb(cb) {
  return typeof cb === 'function' ? cb : noop;
}
function noop() {}

function findParent(finder, node, rootNode) {
  if (node !== null && node !== rootNode.parentNode) {
    if (finder(node)) {
      if (node === document.body && node.scrollTop === 0) {
        // in chrome body.scrollTop always return 0
        return document.documentElement;
      }
      return node;
    } else {
      return findParent(finder, node.parentNode, rootNode);
    }
  } else {
    return null;
  }
}

/**
 * Get the closest element that scrolls
 * @param {HTMLElement} node - the child element to start searching for scroll parent at
 * @param {HTMLElement} rootNode - the root element of the component
 * @return {HTMLElement} the closest parentNode that scrolls
 */
var getClosestScrollParent = findParent.bind(null, function (node) {
  return node.scrollHeight > node.clientHeight;
});

/**
 * Scroll node into view if necessary
 * @param {HTMLElement} node - the element that should scroll into view
 * @param {HTMLElement} rootNode - the root element of the component
 * @param {Boolean} alignToTop - align element to the top of the visible area of the scrollable ancestor
 */
// eslint-disable-next-line complexity
function scrollIntoView(node, rootNode) {
  var scrollParent = getClosestScrollParent(node, rootNode);
  if (scrollParent === null) {
    return;
  }
  var scrollParentStyles = getComputedStyle(scrollParent);
  var scrollParentRect = scrollParent.getBoundingClientRect();
  var scrollParentBorderTopWidth = parseInt(scrollParentStyles.borderTopWidth, 10);
  var scrollParentBorderBottomWidth = parseInt(scrollParentStyles.borderBottomWidth, 10);
  var bordersWidth = scrollParentBorderTopWidth + scrollParentBorderBottomWidth;
  var scrollParentTop = scrollParentRect.top + scrollParentBorderTopWidth;
  var nodeRect = node.getBoundingClientRect();

  if (nodeRect.top < 0 && scrollParentRect.top < 0) {
    scrollParent.scrollTop += nodeRect.top;
    return;
  }

  if (nodeRect.top < 0) {
    // the item is above the viewport and the parent is not above the viewport
    scrollParent.scrollTop += nodeRect.top - scrollParentTop;
    return;
  }

  if (nodeRect.top > 0 && scrollParentRect.top < 0) {
    if (scrollParentRect.bottom > 0 && nodeRect.bottom + bordersWidth > scrollParentRect.bottom) {
      // the item is below scrollable area
      scrollParent.scrollTop += nodeRect.bottom - scrollParentRect.bottom + bordersWidth;
    }
    // item and parent top are on different sides of view top border (do nothing)
    return;
  }

  var nodeOffsetTop = nodeRect.top + scrollParent.scrollTop;
  var nodeTop = nodeOffsetTop - scrollParentTop;
  if (nodeTop < scrollParent.scrollTop) {
    // the item is above the scrollable area
    scrollParent.scrollTop = nodeTop;
  } else if (nodeTop + nodeRect.height + bordersWidth > scrollParent.scrollTop + scrollParentRect.height) {
    // the item is below the scrollable area
    scrollParent.scrollTop = nodeTop + nodeRect.height - scrollParentRect.height + bordersWidth;
  }
  // the item is within the scrollable area (do nothing)
}

/**
 * Simple debounce implementation. Will call the given
 * function once after the time given has passed since
 * it was last called.
 * @param {Function} fn the function to call after the time
 * @param {Number} time the time to wait
 * @return {Function} the debounced function
 */
function debounce(fn, time) {
  var timeoutId = void 0;
  return function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(function () {
      timeoutId = null;
      fn.apply(undefined, args);
    }, time);
  };
}

/**
 * This is intended to be used to compose event handlers.
 * They are executed in order until one of them sets
 * `event.preventDownshiftDefault = true`.
 * @param {Function} fns the event handler functions
 * @return {Function} the event handler to add to an element
 */
function composeEventHandlers() {
  for (var _len2 = arguments.length, fns = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    fns[_key2] = arguments[_key2];
  }

  return function (event) {
    for (var _len3 = arguments.length, args = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
      args[_key3 - 1] = arguments[_key3];
    }

    return fns.some(function (fn) {
      fn && fn.apply(undefined, [event].concat(args));
      // TODO: remove everything after the || in the next breaking change
      return event.preventDownshiftDefault || event.defaultPrevented;
    });
  };
}

/**
 * This generates a unique ID for an instance of Downshift
 * @return {String} the unique ID
 */
function generateId() {
  return String(idCounter++);
}

/**
 * Resets idCounter to 0. Used for SSR.
 */
function resetIdCounter() {
  idCounter = 0;
}

/**
 * Returns the first argument that is not undefined
 * @param {...*} args the arguments
 * @return {*} the defined value
 */
function firstDefined() {
  for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
    args[_key4] = arguments[_key4];
  }

  return args.find(function (a) {
    return typeof a !== 'undefined';
  });
}

// eslint-disable-next-line complexity
function getA11yStatusMessage(_ref) {
  var isOpen = _ref.isOpen,
      highlightedItem = _ref.highlightedItem,
      selectedItem = _ref.selectedItem,
      resultCount = _ref.resultCount,
      previousResultCount = _ref.previousResultCount,
      itemToString = _ref.itemToString;

  if (!isOpen) {
    if (selectedItem) {
      return itemToString(selectedItem);
    } else {
      return '';
    }
  }

  if (!resultCount) {
    return 'No results.';
  } else if (!highlightedItem || resultCount !== previousResultCount) {
    return resultCount + ' ' + (resultCount === 1 ? 'result is' : 'results are') + ' available, use up and down arrow keys to navigate.';
  }
  return itemToString(highlightedItem);
}

/**
 * Takes an argument and if it's an array, returns the first item in the array
 * otherwise returns the argument
 * @param {*} arg the maybe-array
 * @param {*} defaultValue the value if arg is falsey not defined
 * @return {*} the arg or it's first item
 */
function unwrapArray(arg, defaultValue) {
  arg = Array.isArray(arg) ? /* istanbul ignore next (preact) */arg[0] : arg;
  if (!arg && defaultValue) {
    return defaultValue;
  } else {
    return arg;
  }
}

/**
 * @param {Object} element (P)react element
 * @return {Boolean} whether it's a DOM element
 */
function isDOMElement(element) {
  /* istanbul ignore if */
  if (element.nodeName) {
    // then this is preact
    return typeof element.nodeName === 'string';
  } else {
    // then we assume this is react
    return typeof element.type === 'string';
  }
}

/**
 * @param {Object} element (P)react element
 * @return {Object} the props
 */
function getElementProps(element) {
  // props for react, attributes for preact
  return element.props || /* istanbul ignore next (preact) */element.attributes;
}

/**
 * Throws a helpful error message for required properties. Useful
 * to be used as a default in destructuring or object params.
 * @param {String} fnName the function name
 * @param {String} propName the prop name
 */
function requiredProp(fnName, propName) {
  throw new Error('The property "' + propName + '" is required in "' + fnName + '"');
}

var stateKeys = ['highlightedIndex', 'inputValue', 'isOpen', 'selectedItem', 'type'];
/**
 * @param {Object} state The state object
 * @return {Object} State that is relevant to downshift
 */
function pickState() {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var result = {};
  stateKeys.forEach(function (k) {
    if (state.hasOwnProperty(k)) {
      result[k] = state[k];
    }
  });
  return result;
}

/**
 * Simple check if the value passed is object literal
 * @param {*} obj any things
 * @return {Boolean} whether it's object literal
 */
function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};









var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};



var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};









var objectWithoutProperties = function (obj, keys) {
  var target = {};

  for (var i in obj) {
    if (keys.indexOf(i) >= 0) continue;
    if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
    target[i] = obj[i];
  }

  return target;
};

var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

/* eslint camelcase:0 */

var Downshift$1 = function (_Component) {
  inherits(Downshift, _Component);

  function Downshift() {
    classCallCheck(this, Downshift);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var _this = possibleConstructorReturn(this, _Component.call.apply(_Component, [this].concat(args)));

    _initialiseProps.call(_this);

    var state = _this.getState({
      highlightedIndex: _this.props.defaultHighlightedIndex,
      isOpen: _this.props.defaultIsOpen,
      inputValue: _this.props.defaultInputValue,
      selectedItem: _this.props.defaultSelectedItem
    });
    if (state.selectedItem) {
      state.inputValue = _this.props.itemToString(state.selectedItem);
    }
    _this.state = state;
    _this.id = _this.props.id || 'downshift-' + generateId();
    return _this;
  }
  // itemCount can be changed asynchronously
  // from within downshift (so it can't come from a prop)
  // this is why we store it as an instance and use
  // getItemCount rather than just use items.length
  // (to support windowing + async)


  /**
   * Gets the state based on internal state or props
   * If a state value is passed via props, then that
   * is the value given, otherwise it's retrieved from
   * stateToMerge
   *
   * This will perform a shallow merge of the given state object
   * with the state coming from props
   * (for the controlled component scenario)
   * This is used in state updater functions so they're referencing
   * the right state regardless of where it comes from.
   *
   * @param {Object} stateToMerge defaults to this.state
   * @return {Object} the state
   */
  Downshift.prototype.getState = function getState() {
    var _this2 = this;

    var stateToMerge = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.state;

    return Object.keys(stateToMerge).reduce(function (state, key) {
      state[key] = _this2.isControlledProp(key) ? _this2.props[key] : stateToMerge[key];
      return state;
    }, {});
  };

  /**
   * This determines whether a prop is a "controlled prop" meaning it is
   * state which is controlled by the outside of this component rather
   * than within this component.
   * @param {String} key the key to check
   * @return {Boolean} whether it is a controlled controlled prop
   */


  Downshift.prototype.isControlledProp = function isControlledProp(key) {
    return this.props[key] !== undefined;
  };

  Downshift.prototype.getItemCount = function getItemCount() {
    // things read better this way. They're in priority order:
    // 1. `this.itemCount`
    // 2. `this.props.itemCount`
    // 3. `this.items.length`
    /* eslint-disable no-negated-condition */
    if (this.itemCount != null) {
      return this.itemCount;
    } else if (this.props.itemCount !== undefined) {
      return this.props.itemCount;
    } else {
      return this.items.length;
    }
    /* eslint-enable no-negated-condition */
  };

  // eslint-disable-next-line complexity


  // any piece of our state can live in two places:
  // 1. Uncontrolled: it's internal (this.state)
  //    We will call this.setState to update that state
  // 2. Controlled: it's external (this.props)
  //    We will call this.props.onStateChange to update that state
  //
  // In addition, we'll call this.props.onChange if the
  // selectedItem is changed.
  Downshift.prototype.internalSetState = function internalSetState(stateToSet, cb) {
    var _this3 = this;

    var isItemSelected = void 0,
        onChangeArg = void 0;

    var onStateChangeArg = {};
    var isStateToSetFunction = typeof stateToSet === 'function';

    // we want to call `onInputValueChange` before the `setState` call
    // so someone controlling the `inputValue` state gets notified of
    // the input change as soon as possible. This avoids issues with
    // preserving the cursor position.
    // See https://github.com/paypal/downshift/issues/217 for more info.
    if (!isStateToSetFunction && stateToSet.hasOwnProperty('inputValue')) {
      this.props.onInputValueChange(stateToSet.inputValue, _extends({}, this.getStateAndHelpers(), stateToSet));
    }
    return this.setState(function (state) {
      state = _this3.getState(state);
      stateToSet = isStateToSetFunction ? stateToSet(state) : stateToSet;

      // Your own function that could modify the state that will be set.
      stateToSet = _this3.props.stateReducer(state, stateToSet);

      // checks if an item is selected, regardless of if it's different from
      // what was selected before
      // used to determine if onSelect and onChange callbacks should be called
      isItemSelected = stateToSet.hasOwnProperty('selectedItem');
      // this keeps track of the object we want to call with setState
      var nextState = {};
      // this is just used to tell whether the state changed
      var nextFullState = {};
      // we need to call on change if the outside world is controlling any of our state
      // and we're trying to update that state. OR if the selection has changed and we're
      // trying to update the selection
      if (isItemSelected && stateToSet.selectedItem !== state.selectedItem) {
        onChangeArg = stateToSet.selectedItem;
      }
      stateToSet.type = stateToSet.type || Downshift.stateChangeTypes.unknown;

      Object.keys(stateToSet).forEach(function (key) {
        // onStateChangeArg should only have the state that is
        // actually changing
        if (state[key] !== stateToSet[key]) {
          onStateChangeArg[key] = stateToSet[key];
        }
        // the type is useful for the onStateChangeArg
        // but we don't actually want to set it in internal state.
        // this is an undocumented feature for now... Not all internalSetState
        // calls support it and I'm not certain we want them to yet.
        // But it enables users controlling the isOpen state to know when
        // the isOpen state changes due to mouseup events which is quite handy.
        if (key === 'type') {
          return;
        }
        nextFullState[key] = stateToSet[key];
        // if it's coming from props, then we don't care to set it internally
        if (!_this3.isControlledProp(key)) {
          nextState[key] = stateToSet[key];
        }
      });

      // if stateToSet is a function, then we weren't able to call onInputValueChange
      // earlier, so we'll call it now that we know what the inputValue state will be.
      if (isStateToSetFunction && stateToSet.hasOwnProperty('inputValue')) {
        _this3.props.onInputValueChange(stateToSet.inputValue, _extends({}, _this3.getStateAndHelpers(), stateToSet));
      }

      return nextState;
    }, function () {
      // call the provided callback if it's a callback
      cbToCb(cb)();

      // only call the onStateChange and onChange callbacks if
      // we have relevant information to pass them.
      var hasMoreStateThanType = Object.keys(onStateChangeArg).length > 1;
      if (hasMoreStateThanType) {
        _this3.props.onStateChange(onStateChangeArg, _this3.getStateAndHelpers());
      }

      if (isItemSelected) {
        _this3.props.onSelect(stateToSet.selectedItem, _this3.getStateAndHelpers());
      }

      if (onChangeArg !== undefined) {
        _this3.props.onChange(onChangeArg, _this3.getStateAndHelpers());
      }
      // this is currently undocumented and therefore subject to change
      // We'll try to not break it, but just be warned.
      _this3.props.onUserAction(onStateChangeArg, _this3.getStateAndHelpers());
    });
  };

  Downshift.prototype.getStateAndHelpers = function getStateAndHelpers() {
    var _getState = this.getState(),
        highlightedIndex = _getState.highlightedIndex,
        inputValue = _getState.inputValue,
        selectedItem = _getState.selectedItem,
        isOpen = _getState.isOpen;

    var itemToString = this.props.itemToString;
    var id = this.id;
    var getRootProps = this.getRootProps,
        getButtonProps = this.getButtonProps,
        getLabelProps = this.getLabelProps,
        getInputProps = this.getInputProps,
        getItemProps = this.getItemProps,
        openMenu = this.openMenu,
        closeMenu = this.closeMenu,
        toggleMenu = this.toggleMenu,
        selectItem = this.selectItem,
        selectItemAtIndex = this.selectItemAtIndex,
        selectHighlightedItem = this.selectHighlightedItem,
        setHighlightedIndex = this.setHighlightedIndex,
        clearSelection = this.clearSelection,
        clearItems = this.clearItems,
        reset = this.reset,
        setItemCount = this.setItemCount,
        unsetItemCount = this.unsetItemCount;

    return {
      // prop getters
      getRootProps: getRootProps,
      getButtonProps: getButtonProps,
      getLabelProps: getLabelProps,
      getInputProps: getInputProps,
      getItemProps: getItemProps,

      // actions
      reset: reset,
      openMenu: openMenu,
      closeMenu: closeMenu,
      toggleMenu: toggleMenu,
      selectItem: selectItem,
      selectItemAtIndex: selectItemAtIndex,
      selectHighlightedItem: selectHighlightedItem,
      setHighlightedIndex: setHighlightedIndex,
      clearSelection: clearSelection,
      clearItems: clearItems,
      setItemCount: setItemCount,
      unsetItemCount: unsetItemCount,

      //props
      itemToString: itemToString,

      //derived
      id: id,

      // state
      highlightedIndex: highlightedIndex,
      inputValue: inputValue,
      isOpen: isOpen,
      selectedItem: selectedItem
    };
  };

  //////////////////////////// ROOT

  //\\\\\\\\\\\\\\\\\\\\\\\\\\ ROOT

  //////////////////////////// BUTTON

  //\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ BUTTON

  /////////////////////////////// LABEL

  //\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ LABEL

  /////////////////////////////// INPUT

  //\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ INPUT

  /////////////////////////////// ITEM
  Downshift.prototype.getItemId = function getItemId(index) {
    return this.id + '-item-' + index;
  };
  //\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ ITEM

  Downshift.prototype.componentDidMount = function componentDidMount() {
    var _this4 = this;

    // the _isMounted property is because we have `updateStatus` in a `debounce`
    // and we don't want to update the status if the component has been umounted
    this._isMounted = true;
    /* istanbul ignore if (react-native) */
    {
      // this.isMouseDown helps us track whether the mouse is currently held down.
      // This is useful when the user clicks on an item in the list, but holds the mouse
      // down long enough for the list to disappear (because the blur event fires on the input)
      // this.isMouseDown is used in the blur handler on the input to determine whether the blur event should
      // trigger hiding the menu.
      var onMouseDown = function () {
        _this4.isMouseDown = true;
      };
      var onMouseUp = function (event) {
        var document = _this4.props.environment.document;

        _this4.isMouseDown = false;
        if ((event.target === _this4._rootNode || !_this4._rootNode.contains(event.target)) && _this4.getState().isOpen && (!_this4.inputId || document.activeElement.id !== _this4.inputId)) {
          _this4.reset({ type: Downshift.stateChangeTypes.mouseUp }, function () {
            return _this4.props.onOuterClick(_this4.getStateAndHelpers());
          });
        }
      };
      this.props.environment.addEventListener('mousedown', onMouseDown);
      this.props.environment.addEventListener('mouseup', onMouseUp);

      this.cleanup = function () {
        _this4._isMounted = false;
        _this4.props.environment.removeEventListener('mousedown', onMouseDown);
        _this4.props.environment.removeEventListener('mouseup', onMouseUp);
      };
    }
  };

  Downshift.prototype.componentDidUpdate = function componentDidUpdate(prevProps, prevState) {
    if (this.isControlledProp('selectedItem') && this.props.selectedItemChanged(prevProps.selectedItem, this.props.selectedItem)) {
      this.internalSetState({
        type: Downshift.stateChangeTypes.controlledPropUpdatedSelectedItem,
        inputValue: this.props.itemToString(this.props.selectedItem)
      });
    }

    var current = this.props.highlightedIndex === undefined ? this.state : this.props;
    var prev = prevProps.highlightedIndex === undefined ? prevState : prevProps;

    if (current.highlightedIndex !== prev.highlightedIndex && !this.avoidScrolling) {
      this.scrollHighlightedItemIntoView();
    }

    this.updateStatus();
  };

  Downshift.prototype.componentWillUnmount = function componentWillUnmount() {
    this.cleanup(); // avoids memory leak
  };

  // eslint-disable-next-line complexity


  Downshift.prototype.render = function render() {
    var children = unwrapArray(this.props.render || this.props.children, noop);
    // because the items are rerendered every time we call the children
    // we clear this out each render and
    this.clearItems();
    // we reset this so we know whether the user calls getRootProps during
    // this render. If they do then we don't need to do anything,
    // if they don't then we need to clone the element they return and
    // apply the props for them.
    this.getRootProps.called = false;
    this.getRootProps.refKey = undefined;
    this.getRootProps.suppressRefError = undefined;
    // we do something similar for getLabelProps
    this.getLabelProps.called = false;
    // and something similar for getInputProps
    this.getInputProps.called = false;
    var element = unwrapArray(children(this.getStateAndHelpers()));
    if (!element) {
      return null;
    }
    if (this.getRootProps.called) {
      if (!this.getRootProps.suppressRefError) {
        validateGetRootPropsCalledCorrectly(element, this.getRootProps);
      }
      return element;
    } else if (isDOMElement(element)) {
      // they didn't apply the root props, but we can clone
      // this and apply the props ourselves
      return React.cloneElement(element, this.getRootProps(getElementProps(element)));
    } else {
      // they didn't apply the root props, but they need to
      // otherwise we can't query around the autocomplete
      throw new Error('downshift: If you return a non-DOM element, you must use apply the getRootProps function');
    }
  };

  return Downshift;
}(Component);

Downshift$1.defaultProps = {
  defaultHighlightedIndex: null,
  defaultSelectedItem: null,
  defaultInputValue: '',
  defaultIsOpen: false,
  getA11yStatusMessage: getA11yStatusMessage,
  itemToString: function itemToString(i) {
    if (i == null) {
      return '';
    }
    if (process.env.NODE_ENV !== 'production' && isPlainObject(i)) {
      //eslint-disable-next-line no-console
      console.warn('downshift: An object was passed to the default implementation of `itemToString`. You should probably provide your own `itemToString` implementation. Please refer to the `itemToString` API documentation.', 'The object that was passed:', i);
    }
    return String(i);
  },
  onStateChange: function onStateChange() {},
  onInputValueChange: function onInputValueChange() {},
  onUserAction: function onUserAction() {},
  onChange: function onChange() {},
  onSelect: function onSelect() {},
  onOuterClick: function onOuterClick() {},
  selectedItemChanged: function selectedItemChanged(prevItem, item) {
    return prevItem !== item;
  },
  environment: typeof window === 'undefined' /* istanbul ignore next (ssr) */
  ? {} : window,
  stateReducer: function stateReducer(state, stateToSet) {
    return stateToSet;
  },
  breakingChanges: {}
};
Downshift$1.stateChangeTypes = {
  unknown: '__autocomplete_unknown__',
  mouseUp: '__autocomplete_mouseup__',
  itemMouseEnter: '__autocomplete_item_mouseenter__',
  keyDownArrowUp: '__autocomplete_keydown_arrow_up__',
  keyDownArrowDown: '__autocomplete_keydown_arrow_down__',
  keyDownEscape: '__autocomplete_keydown_escape__',
  keyDownEnter: '__autocomplete_keydown_enter__',
  clickItem: '__autocomplete_click_item__',
  blurInput: '__autocomplete_blur_input__',
  changeInput: '__autocomplete_change_input__',
  keyDownSpaceButton: '__autocomplete_keydown_space_button__',
  clickButton: '__autocomplete_click_button__',
  blurButton: '__autocomplete_blur_button__',
  controlledPropUpdatedSelectedItem: '__autocomplete_controlled_prop_updated_selected_item__'
};

var _initialiseProps = function () {
  var _this5 = this;

  this.input = null;
  this.items = [];
  this.itemCount = null;
  this.previousResultCount = 0;

  this.setItemCount = function (count) {
    return _this5.itemCount = count;
  };

  this.unsetItemCount = function () {
    return _this5.itemCount = null;
  };

  this.getItemNodeFromIndex = function (index) {
    return _this5.props.environment.document.getElementById(_this5.getItemId(index));
  };

  this.setHighlightedIndex = function () {
    var highlightedIndex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _this5.props.defaultHighlightedIndex;
    var otherStateToSet = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    otherStateToSet = pickState(otherStateToSet);
    _this5.internalSetState(_extends({ highlightedIndex: highlightedIndex }, otherStateToSet));
  };

  this.scrollHighlightedItemIntoView = function () {
    /* istanbul ignore else (react-native) */
    {
      var node = _this5.getItemNodeFromIndex(_this5.getState().highlightedIndex);
      var rootNode = _this5._rootNode;
      scrollIntoView(node, rootNode);
    }
  };

  this.openAndHighlightDefaultIndex = function () {
    var otherStateToSet = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _this5.setHighlightedIndex(undefined, _extends({ isOpen: true }, otherStateToSet));
  };

  this.highlightDefaultIndex = function () {
    var otherStateToSet = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _this5.setHighlightedIndex(undefined, otherStateToSet);
  };

  this.moveHighlightedIndex = function (amount, otherStateToSet) {
    if (_this5.getState().isOpen) {
      _this5.changeHighlightedIndex(amount, otherStateToSet);
    } else {
      _this5.openAndHighlightDefaultIndex(otherStateToSet);
    }
  };

  this.changeHighlightedIndex = function (moveAmount, otherStateToSet) {
    var itemsLastIndex = _this5.getItemCount() - 1;
    if (itemsLastIndex < 0) {
      return;
    }

    var _getState2 = _this5.getState(),
        highlightedIndex = _getState2.highlightedIndex;

    var baseIndex = highlightedIndex;
    if (baseIndex === null) {
      baseIndex = moveAmount > 0 ? -1 : itemsLastIndex + 1;
    }
    var newIndex = baseIndex + moveAmount;
    if (newIndex < 0) {
      newIndex = itemsLastIndex;
    } else if (newIndex > itemsLastIndex) {
      newIndex = 0;
    }
    _this5.setHighlightedIndex(newIndex, otherStateToSet);
  };

  this.clearSelection = function (cb) {
    _this5.internalSetState({
      selectedItem: null,
      inputValue: '',
      isOpen: false
    }, cb);
  };

  this.selectItem = function (item, otherStateToSet, cb) {
    otherStateToSet = pickState(otherStateToSet);
    _this5.internalSetState(_extends({
      isOpen: false,
      highlightedIndex: _this5.props.defaultHighlightedIndex,
      selectedItem: item,
      inputValue: _this5.isControlledProp('selectedItem') && _this5.props.breakingChanges.resetInputOnSelection ? _this5.props.defaultInputValue : _this5.props.itemToString(item)
    }, otherStateToSet), cb);
  };

  this.selectItemAtIndex = function (itemIndex, otherStateToSet, cb) {
    var item = _this5.items[itemIndex];
    if (item == null) {
      return;
    }
    _this5.selectItem(item, otherStateToSet, cb);
  };

  this.selectHighlightedItem = function (otherStateToSet, cb) {
    return _this5.selectItemAtIndex(_this5.getState().highlightedIndex, otherStateToSet, cb);
  };

  this.rootRef = function (node) {
    return _this5._rootNode = node;
  };

  this.getRootProps = function () {
    var _babelHelpers$extends;

    var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    var _ref3 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        _ref3$suppressRefErro = _ref3.suppressRefError,
        suppressRefError = _ref3$suppressRefErro === undefined ? false : _ref3$suppressRefErro;

    var _ref2$refKey = _ref2.refKey,
        refKey = _ref2$refKey === undefined ? 'ref' : _ref2$refKey,
        rest = objectWithoutProperties(_ref2, ['refKey']);

    // this is used in the render to know whether the user has called getRootProps.
    // It uses that to know whether to apply the props automatically
    _this5.getRootProps.called = true;
    _this5.getRootProps.refKey = refKey;
    _this5.getRootProps.suppressRefError = suppressRefError;
    return _extends((_babelHelpers$extends = {}, _babelHelpers$extends[refKey] = _this5.rootRef, _babelHelpers$extends), rest);
  };

  this.keyDownHandlers = {
    ArrowDown: function ArrowDown(event) {
      event.preventDefault();
      var amount = event.shiftKey ? 5 : 1;
      this.moveHighlightedIndex(amount, {
        type: Downshift$1.stateChangeTypes.keyDownArrowDown
      });
    },
    ArrowUp: function ArrowUp(event) {
      event.preventDefault();
      var amount = event.shiftKey ? -5 : -1;
      this.moveHighlightedIndex(amount, {
        type: Downshift$1.stateChangeTypes.keyDownArrowUp
      });
    },
    Enter: function Enter(event) {
      if (this.getState().isOpen) {
        event.preventDefault();
        this.selectHighlightedItem({
          type: Downshift$1.stateChangeTypes.keyDownEnter
        });
      }
    },
    Escape: function Escape(event) {
      event.preventDefault();
      this.reset({ type: Downshift$1.stateChangeTypes.keyDownEscape });
    }
  };
  this.buttonKeyDownHandlers = _extends({}, this.keyDownHandlers, {
    ' ': function _(event) {
      event.preventDefault();
      this.toggleMenu({ type: Downshift$1.stateChangeTypes.keyDownSpaceButton });
    }
  });

  this.getButtonProps = function () {
    var _ref4 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    var onClick = _ref4.onClick,
        onKeyDown = _ref4.onKeyDown,
        onBlur = _ref4.onBlur,
        rest = objectWithoutProperties(_ref4, ['onClick', 'onKeyDown', 'onBlur']);

    var _getState3 = _this5.getState(),
        isOpen = _getState3.isOpen;

    var enabledEventHandlers = {
      onClick: composeEventHandlers(onClick, _this5.button_handleClick),
      onKeyDown: composeEventHandlers(onKeyDown, _this5.button_handleKeyDown),
      onBlur: composeEventHandlers(onBlur, _this5.button_handleBlur)
    };
    var eventHandlers = rest.disabled ? {} : enabledEventHandlers;
    return _extends({
      type: 'button',
      role: 'button',
      'aria-label': isOpen ? 'close menu' : 'open menu',
      'aria-expanded': isOpen,
      'aria-haspopup': true
    }, eventHandlers, rest);
  };

  this.button_handleKeyDown = function (event) {
    if (_this5.buttonKeyDownHandlers[event.key]) {
      _this5.buttonKeyDownHandlers[event.key].call(_this5, event);
    }
  };

  this.button_handleClick = function (event) {
    event.preventDefault();

    // handle odd case for Safari and Firefox which
    // don't give the button the focus properly.
    /* istanbul ignore if (can't reasonably test this) */
    if (
    /* istanbul ignore next (react-native) */
    !false && _this5.props.environment.document.activeElement === _this5.props.environment.document.body) {
      event.target.focus();
    }

    _this5.toggleMenu({ type: Downshift$1.stateChangeTypes.clickButton });
  };

  this.button_handleBlur = function () {
    if (!_this5.isMouseDown) {
      _this5.reset({ type: Downshift$1.stateChangeTypes.blurButton });
    }
  };

  this.getLabelProps = function () {
    var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _this5.getLabelProps.called = true;
    if (_this5.getInputProps.called && props.htmlFor && props.htmlFor !== _this5.inputId) {
      throw new Error('downshift: You provided the htmlFor of "' + props.htmlFor + '" for your label, but the id of your input is "' + _this5.inputId + '". You must either remove the id from your input or set the htmlFor of the label equal to the input id.');
    }
    _this5.inputId = firstDefined(_this5.inputId, props.htmlFor, _this5.id + '-input');
    return _extends({}, props, {
      htmlFor: _this5.inputId
    });
  };

  this.inputRef = function (node) {
    return _this5._inputNode = node;
  };

  this.getInputProps = function () {
    var _ref6, _babelHelpers$extends2;

    var _ref5 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    var onKeyDown = _ref5.onKeyDown,
        onBlur = _ref5.onBlur,
        onChange = _ref5.onChange,
        onInput = _ref5.onInput,
        _ref5$refKey = _ref5.refKey,
        refKey = _ref5$refKey === undefined ? 'ref' : _ref5$refKey,
        rest = objectWithoutProperties(_ref5, ['onKeyDown', 'onBlur', 'onChange', 'onInput', 'refKey']);

    _this5.getInputProps.called = true;
    if (_this5.getLabelProps.called && rest.id && rest.id !== _this5.inputId) {
      throw new Error('downshift: You provided the id of "' + rest.id + '" for your input, but the htmlFor of your label is "' + _this5.inputId + '". You must either remove the id from your input or set the htmlFor of the label equal to the input id.');
    }
    _this5.inputId = firstDefined(_this5.inputId, rest.id, _this5.id + '-input');
    var onChangeKey = void 0;
    /* istanbul ignore next (preact) */
    onChangeKey = 'onChange';

    var _getState4 = _this5.getState(),
        inputValue = _getState4.inputValue,
        isOpen = _getState4.isOpen,
        highlightedIndex = _getState4.highlightedIndex;

    var eventHandlers = rest.disabled ? {} : (_ref6 = {}, _ref6[onChangeKey] = composeEventHandlers(onChange, onInput, _this5.input_handleChange), _ref6.onKeyDown = composeEventHandlers(onKeyDown, _this5.input_handleKeyDown), _ref6.onBlur = composeEventHandlers(onBlur, _this5.input_handleBlur), _ref6);
    return _extends({
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-expanded': isOpen,
      'aria-activedescendant': isOpen && typeof highlightedIndex === 'number' && highlightedIndex >= 0 ? _this5.getItemId(highlightedIndex) : null,
      autoComplete: 'off',
      value: inputValue
    }, eventHandlers, rest, (_babelHelpers$extends2 = {
      id: _this5.inputId
    }, _babelHelpers$extends2[refKey] = null, _babelHelpers$extends2));
  };

  this.input_handleKeyDown = function (event) {
    if (event.key && _this5.keyDownHandlers[event.key]) {
      _this5.keyDownHandlers[event.key].call(_this5, event);
    }
  };

  this.input_handleChange = function (event) {
    _this5.internalSetState({
      type: Downshift$1.stateChangeTypes.changeInput,
      isOpen: true,
      inputValue: event.target.value
    });
  };

  this.input_handleBlur = function () {
    if (!_this5.isMouseDown) {
      _this5.reset({ type: Downshift$1.stateChangeTypes.blurInput });
    }
  };

  this.getItemProps = function () {
    var _enabledEventHandlers;

    var _ref7 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    var onMouseMove = _ref7.onMouseMove,
        onMouseDown = _ref7.onMouseDown,
        onClick = _ref7.onClick,
        index = _ref7.index,
        _ref7$item = _ref7.item,
        item = _ref7$item === undefined ? requiredProp('getItemProps', 'item') : _ref7$item,
        rest = objectWithoutProperties(_ref7, ['onMouseMove', 'onMouseDown', 'onClick', 'index', 'item']);

    if (index === undefined) {
      _this5.items.push(item);
      index = _this5.items.indexOf(item);
    } else {
      _this5.items[index] = item;
    }

    var onSelectKey = 'onClick';

    var enabledEventHandlers = (_enabledEventHandlers = {
      // onMouseMove is used over onMouseEnter here. onMouseMove
      // is only triggered on actual mouse movement while onMouseEnter
      // can fire on DOM changes, interrupting keyboard navigation
      onMouseMove: composeEventHandlers(onMouseMove, function () {
        if (index === _this5.getState().highlightedIndex) {
          return;
        }
        _this5.setHighlightedIndex(index, {
          type: Downshift$1.stateChangeTypes.itemMouseEnter
        });

        // We never want to manually scroll when changing state based
        // on `onMouseMove` because we will be moving the element out
        // from under the user which is currently scrolling/moving the
        // cursor
        _this5.avoidScrolling = true;
        setTimeout(function () {
          return _this5.avoidScrolling = false;
        }, 250);
      }),
      onMouseDown: composeEventHandlers(onMouseDown, function (event) {
        // This prevents the activeElement from being changed
        // to the item so it can remain with the current activeElement
        // which is a more common use case.
        event.preventDefault();
      })
    }, _enabledEventHandlers[onSelectKey] = composeEventHandlers(onClick, function () {
      _this5.selectItemAtIndex(index, {
        type: Downshift$1.stateChangeTypes.clickItem
      });
    }), _enabledEventHandlers);

    var eventHandlers = rest.disabled ? {} : enabledEventHandlers;

    return _extends({
      id: _this5.getItemId(index)
    }, eventHandlers, rest);
  };

  this.clearItems = function () {
    _this5.items = [];
  };

  this.reset = function () {
    var otherStateToSet = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var cb = arguments[1];

    otherStateToSet = pickState(otherStateToSet);
    _this5.internalSetState(function (_ref8) {
      var selectedItem = _ref8.selectedItem;
      return _extends({
        isOpen: false,
        highlightedIndex: _this5.props.defaultHighlightedIndex,
        inputValue: _this5.props.itemToString(selectedItem)
      }, otherStateToSet);
    }, cbToCb(cb));
  };

  this.toggleMenu = function () {
    var otherStateToSet = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var cb = arguments[1];

    otherStateToSet = pickState(otherStateToSet);
    _this5.internalSetState(function (_ref9) {
      var isOpen = _ref9.isOpen;

      return _extends({ isOpen: !isOpen }, otherStateToSet);
    }, function () {
      var _getState5 = _this5.getState(),
          isOpen = _getState5.isOpen;

      if (isOpen) {
        _this5.highlightDefaultIndex();
      }
      cbToCb(cb)();
    });
  };

  this.openMenu = function (cb) {
    _this5.internalSetState({ isOpen: true }, cbToCb(cb));
  };

  this.closeMenu = function (cb) {
    _this5.internalSetState({ isOpen: false }, cbToCb(cb));
  };

  this.updateStatus = debounce(function () {
    if (!_this5._isMounted) {
      return;
    }
    var state = _this5.getState();
    var item = _this5.items[state.highlightedIndex];
    var resultCount = _this5.getItemCount();
    var status = _this5.props.getA11yStatusMessage(_extends({
      itemToString: _this5.props.itemToString,
      previousResultCount: _this5.previousResultCount,
      resultCount: resultCount,
      highlightedItem: item
    }, state));
    _this5.previousResultCount = resultCount;
    /* istanbul ignore else (react-native) */
    setStatus(status);
  }, 200);
};

process.env.NODE_ENV !== "production" ? Downshift$1.propTypes = {
  children: PropTypes.func,
  render: PropTypes.func,
  defaultHighlightedIndex: PropTypes.number,
  defaultSelectedItem: PropTypes.any,
  defaultInputValue: PropTypes.string,
  defaultIsOpen: PropTypes.bool,
  getA11yStatusMessage: PropTypes.func,
  itemToString: PropTypes.func,
  onChange: PropTypes.func,
  onSelect: PropTypes.func,
  onStateChange: PropTypes.func,
  onInputValueChange: PropTypes.func,
  onUserAction: PropTypes.func,
  onOuterClick: PropTypes.func,
  selectedItemChanged: PropTypes.func,
  stateReducer: PropTypes.func,
  itemCount: PropTypes.number,
  id: PropTypes.string,
  environment: PropTypes.shape({
    addEventListener: PropTypes.func,
    removeEventListener: PropTypes.func,
    document: PropTypes.shape({
      getElementById: PropTypes.func,
      activeElement: PropTypes.any,
      body: PropTypes.any
    })
  }),
  // things we keep in state for uncontrolled components
  // but can accept as props for controlled components
  /* eslint-disable react/no-unused-prop-types */
  selectedItem: PropTypes.any,
  isOpen: PropTypes.bool,
  inputValue: PropTypes.string,
  highlightedIndex: PropTypes.number,
  breakingChanges: PropTypes.shape({
    resetInputOnSelection: PropTypes.bool
  })
  /* eslint-enable */
} : void 0;


function validateGetRootPropsCalledCorrectly(element, _ref) {
  var refKey = _ref.refKey;

  var refKeySpecified = refKey !== 'ref';
  var isComposite = !isDOMElement(element);
  if (isComposite && !refKeySpecified) {
    throw new Error('downshift: You returned a non-DOM element. You must specify a refKey in getRootProps');
  } else if (!isComposite && refKeySpecified) {
    throw new Error('downshift: You returned a DOM element. You should not specify a refKey in getRootProps. You specified "' + refKey + '"');
  }
  if (!getElementProps(element)[refKey]) {
    throw new Error('downshift: You must apply the ref prop "' + refKey + '" from getRootProps onto your root element.');
  }
}

/*
 * Fix importing in typescript after rollup compilation
 * https://github.com/rollup/rollup/issues/1156
 * https://github.com/Microsoft/TypeScript/issues/13017#issuecomment-268657860
 */
Downshift$1.default = Downshift$1;
Downshift$1.resetIdCounter = resetIdCounter;

export default Downshift$1;
