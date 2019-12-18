import React, {
  Dispatch,
  EffectCallback,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import axios from "axios";
import BScroll from "@better-scroll/core";

export const useMount = (fn: Function) => {
  useEffectOnce(() => {
    fn();
  });
};

export const useUnMount = (fn: () => void) => {
  useEffectOnce(() => fn());
};

export function useSetState<S extends object>(
  initialState: S | (() => S)
): [S, (state: Partial<S> | ((state: S) => Partial<S>)) => void] {
  const [_state, _setState] = useState<S>(initialState);

  const setState = useCallback(
    (state: Partial<S> | ((state: S) => Partial<S>)) => {
      _setState((prev: S) => {
        let nextState = state;
        if (typeof state === "function") {
          nextState = state(prev);
        }
        return { ...prev, ...nextState };
      });
    },
    []
  );
  return [_state, setState];
}

export function useStorage<T>(
  key: string,
  defaultValue: T | (() => T),
  keepOnWindowClose: boolean = true
): [T | undefined, Dispatch<SetStateAction<T>>, () => void] {
  const storage = keepOnWindowClose ? sessionStorage : localStorage;

  const getStorageValue = () => {
    try {
      const storageItem = storage.getItem(key);
      if (storageItem !== null) {
        return JSON.parse(storageItem);
      } else if (defaultValue) {
        const value =
          typeof defaultValue === "function"
            ? (defaultValue as () => T)()
            : defaultValue;
        storage.setItem(key, JSON.stringify(value));
        return value;
      }
    } catch (e) {
      console.warn(`无法获取${key}`, e);
    }
    return undefined;
  };

  const [value, setValue] = useState(getStorageValue);

  const save = useCallback<Dispatch<SetStateAction<T>>>(
    value => {
      setValue((prev: T) => {
        const finalValue =
          typeof value === "function"
            ? (value as (prev: T | undefined) => T)(prev)
            : value;
        storage.setItem(key, JSON.stringify(finalValue));
        return finalValue;
      });
    },
    [key, storage]
  );

  const clear = useCallback(
    () => {
      storage.removeItem(key);
      setValue(undefined);
    },
    [key, storage]
  );

  return [value, save, clear];
}

export function useRefState<T>(
  initialState: T | (() => T)
): [
  T | undefined,
  Dispatch<SetStateAction<T>>,
  MutableRefObject<T | undefined>
] {
  const ins = useRef<T>();
  const [state, setState] = useState(() => {
    const value =
      typeof initialState === "function"
        ? (initialState as () => T)()
        : initialState;
    ins.current = value;
    return value;
  });

  const setValue = useCallback<Dispatch<SetStateAction<T>>>(value => {
    setState((prevState: T) => {
      const finalValue =
        typeof value === "function"
          ? (value as (prev: T) => T)(prevState)
          : value;
      ins.current = finalValue;
      return finalValue;
    });
  }, []);

  return [state, setValue, ins];
}

export function useRefProps<T>(props: T) {
  const ref = useRef<T>(props);
  ref.current = props;
  return ref;
}

export function usePrevious<T>(value: T) {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

export function useToggle(
  initialValue?: boolean
): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [value, setValue] = useState(!!initialValue);
  const toggle = useCallback(() => setValue(value => !value), []);
  return [value, toggle];
}

export function useOnUpdate(fn: () => void, dep?: any[]) {
  const ref = useRef({ fn, mounted: false });
  ref.current.fn = fn;

  useEffect(() => {
    if (!ref.current.mounted) {
      ref.current.mounted = true;
    } else {
      ref.current.fn();
    }
  }, dep);
}

export function useChange<S>(initial?: S | (() => S)) {
  const [value, setValue] = useState<S | undefined>(initial);
  const onChange = useCallback(e => setValue(e.target.value), []);

  return {
    value,
    setValue,
    onChange,
    bindEvent: { onChange, value },
    bind: { onChange: setValue, value }
  };
}

export function useActive(refEl: React.RefObject<HTMLElement>) {
  const [value, setValue] = useState(false);

  useEffect(
    () => {
      const handleMouseDown = () => {
        setValue(true);
      };

      const handleMouseUp = () => {
        setValue(false);
      };

      if (refEl && refEl.current) {
        refEl.current.addEventListener("mousedown", handleMouseDown);
        refEl.current.addEventListener("mouseup", handleMouseUp);
      }

      return () => {
        if (refEl && refEl.current) {
          refEl.current.removeEventListener("mousedown", handleMouseDown);
          refEl.current.removeEventListener("mouseup", handleMouseUp);
        }
      };
    },
    [refEl]
  );

  return value;
}

export function useDraggable(ref: React.RefObject<HTMLElement>) {
  const [{ dx, dy }, setOffset] = useState({ dx: 0, dy: 0 });

  useEffect(
    () => {
      if (ref.current == null) {
        throw new Error(`[useDraggable] ref未注册到组件中`);
      }
      const el = ref.current;

      const handleMouseDown = (event: MouseEvent) => {
        const startX = event.pageX - dx;
        const startY = event.pageY - dy;

        const handleMouseMove = (event: MouseEvent) => {
          const newDx = event.pageX - startX;
          const newDy = event.pageY - startY;
          setOffset({ dx: newDx, dy: newDy });
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener(
          "mouseup",
          () => {
            document.removeEventListener("mousemove", handleMouseMove);
          },
          { once: true }
        );
      };

      el.addEventListener("mousedown", handleMouseDown);

      return () => {
        el.removeEventListener("mousedown", handleMouseDown);
      };
    },
    [dx, dy, ref]
  );

  useEffect(
    () => {
      if (ref.current) {
        ref.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }
    },
    [dx, dy, ref]
  );
}

export function useTimeout(ms: number) {
  const [ready, setReady] = useState<boolean>(false);
  const timerRef = useRef<number>();

  const start = useCallback(
    () => {
      clearTimeout(timerRef.current);
      setReady(true);
      timerRef.current = window.setTimeout(() => {
        setReady(false);
      }, ms);
    },
    [ms]
  );

  const stop = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  useEffect(
    () => {
      return () => {
        stop();
      };
    },
    [stop]
  );

  return [ready, start, stop];
}

export function useDebounce(
  fn: () => void,
  args?: any[],
  ms: number = 100,
  skipMount?: boolean
) {
  const timer = useRef<number>();
  const mountRef = useRef<boolean>(false);

  useEffect(
    () => {
      if (skipMount && !mountRef.current) {
        mountRef.current = true;
        return;
      }
      timer.current = window.setTimeout(() => {
        fn();
      }, ms);
    },
    [fn, ms, skipMount]
  );

  return () => {
    clearTimeout(timer.current);
  };
}

export interface Res<T, S> {
  loading?: boolean;
  error?: Error;
  value?: S;
  setValue: (v: S) => void;
  call: T;
  callIgnoreError: T;
  reset: () => void;
  retry: () => void;
}

let uid = 0;

const getUid = () => uid++;

export function usePromise<T>(
  action: () => Promise<T>
): Res<() => Promise<T>, T>;
export function usePromise(
  action: (...args: any[]) => Promise<any>
): Res<(...args: any) => Promise<any>, any> {
  const actionRef = useRefProps(action);
  const [loading, setLoading, loadingRef] = useRefState<boolean>(false);
  const taskRef = useRef<number>();
  const argsRef = useRef<any[]>();
  const [value, setValue] = useState();
  const [error, setError, errorRef] = useRefState<Error | undefined>(undefined);

  const caller = useCallback(
    async (...args: any[]) => {
      argsRef.current = args;

      if (loadingRef.current) {
        return;
      }
      const taskId = getUid();
      taskRef.current = taskId;

      const shouldContinue = () => {
        return taskId === taskRef.current;
      };

      try {
        setLoading(true);
        setError(undefined);
        const res = await actionRef.current(...args);

        if (!shouldContinue()) return;
        setValue(res);
        return res;
      } catch (error) {
        if (shouldContinue()) {
          setError(error);
        }
        throw error;
      } finally {
        if (shouldContinue()) {
          setLoading(false);
        }
      }
    },
    [actionRef, loadingRef, setError, setLoading]
  );

  const callIgnoreError = useCallback(
    async (...args) => {
      try {
        return await caller(...args);
      } catch {
        // ignore
      }
    },
    [caller]
  );

  const reset = useCallback(
    () => {
      setLoading(false);
      setValue(undefined);
      setError(undefined);
    },
    [setError, setLoading]
  );

  const retry = useCallback(
    () => {
      if (argsRef.current && errorRef.current) {
        return callIgnoreError(...argsRef.current);
      }
      throw new Error("not call yet");
    },
    [callIgnoreError, errorRef]
  );

  return {
    loading,
    error,
    call: caller,
    callIgnoreError,
    value,
    setValue,
    reset,
    retry
  };
}

export function useSearch(search: string = "redux") {
  const [data, setData] = useState();
  const [query, setQuery] = useState<string>(search);
  const [loading, setLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(
    () => {
      const fetchData = async () => {
        setLoading(true);
        setIsError(false);
        try {
          const result = await axios.get(
            "https://hn.algolia.com/api/v1/search?query=" + query
          );
          setData(result.data);
        } catch (e) {
          setIsError(true);
        }
        setLoading(false);
      };
      fetchData();
    },
    [query]
  );

  return { loading, data, setQuery, isError };
}

export function useEffectOnce(effect: EffectCallback) {
  useEffect(effect, []);
}

export const useUpdate: typeof useEffect = (effect, dep) => {
  const isMount = useRef(false);
  const effectRef = useRef(effect);

  useEffect(
    () => {
      if (!isMount.current) {
        isMount.current = true;
      } else {
        return effectRef.current();
      }
    },
    [dep]
  );
};

export function createMemo<T extends (...args: any[]) => any>(fn: T) {
  return (...args: Parameters<T>) =>
    useMemo<ReturnType<T>>(() => fn(...args), [args]);
}

export function useInterval(callback: Function, delay?: number) {
  const lastedCallback = useRef<Function>(() => {});

  useEffect(() => {
    lastedCallback.current = callback;
  });

  useEffect(
    () => {
      if (delay !== null) {
        const interval = setInterval(
          () => lastedCallback.current(),
          delay || 0
        );
        return () => clearInterval(interval);
      }
      return undefined;
    },
    [delay]
  );
}

export function useLogger(componentName: string, ...rest: any[]) {
  useEffectOnce(() => {
    console.log(`${componentName} mounted`, ...rest);
    return () => console.log(`${componentName} unMounted`, ...rest);
  });

  useUpdate(() => {
    console.log(`${componentName} updated`, ...rest);
  });
}

export function useScroll(el: HTMLElement | string | null, options = {}) {
  const scrollIns = useRef<InstanceType<typeof BScroll>>();
  const optionsRef = useRef(options);

  useEffect(
    () => {
      if (el) {
        scrollIns.current = new BScroll(el, optionsRef.current);
      }
      return () => {
        scrollIns.current && scrollIns.current.destroy();
      };
    },
    [el]
  );

  return scrollIns;
}
