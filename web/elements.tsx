import React from 'react';

export { React };

// Export all hooks and top-level React APIs explicitly
export const {
    useState,
    useEffect,
    useContext,
    useReducer,
    useCallback,
    useMemo,
    useRef,
    useImperativeHandle,
    useLayoutEffect,
    useDebugValue,
    useDeferredValue,
    useTransition,
    useId,
    useSyncExternalStore,
    useInsertionEffect,
    Component,
    PureComponent,
    memo,
    createElement,
    cloneElement,
    createContext,
    isValidElement,
    createRef,
    forwardRef,
    lazy,
    Suspense,
    Fragment,
    StrictMode,
    Children,
    version
} = React;

// Export types explicitly
export type {
    ReactNode,
    ReactElement,
    ComponentType,
    ChangeEvent,
    FormEvent,
    MouseEvent,
    KeyboardEvent,
    FocusEvent,
    HTMLAttributes,
    ButtonHTMLAttributes,
    InputHTMLAttributes,
    ImgHTMLAttributes,
    TableHTMLAttributes,
    SVGAttributes,
    Ref,
    RefObject,
    MutableRefObject,
    Context,
    CSSProperties,
    ErrorInfo,
    PropsWithChildren
} from 'react';

export * as ReactDOM from 'react-dom';
export * as ReactDOMClient from 'react-dom/client';
export * from 'react-router-dom';
export * as ReactRouterDOM from 'react-router-dom';
