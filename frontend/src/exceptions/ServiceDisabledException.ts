export default class ServiceDisabledException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceDisabledException';
  }
}
