import type { DeviceState } from "../services/Bluetooth";

export default interface Page {
  title: string;
  path: string;

  button?: React.FC;
  icon: React.FC;
  page: React.FC;

  enabled(state?: DeviceState): boolean;
}
