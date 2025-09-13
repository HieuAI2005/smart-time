import { useStore } from "./store";

export function rehydrateTasks() {
  const api: any = useStore as any;
  api?.persist?.rehydrate?.();
}

export function clearTasksInMemory() {
  useStore.setState({ tasks: [] });
}