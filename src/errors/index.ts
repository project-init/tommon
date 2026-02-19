import { Code, ConnectError } from '@connectrpc/connect';

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class BadRequestError extends AppError {}
export class NotFoundError extends AppError {}
export class ConflictError extends AppError {}
export class PermissionDeniedError extends AppError {}
export class NotImplementedError extends AppError {}
export class ServiceUnavailableError extends AppError {}
export class TimeoutError extends AppError {}
export class PreconditionFailedError extends AppError {}
export class CancelledError extends AppError {}
export class InternalServerError extends AppError {}

export function fromConnectError(err: ConnectError): AppError {
  switch (err.code) {
    case Code.NotFound:
      return new NotFoundError(err.message);
    case Code.InvalidArgument:
      return new BadRequestError(err.message);
    case Code.AlreadyExists:
      return new ConflictError(err.message);
    case Code.PermissionDenied:
      return new PermissionDeniedError(err.message);
    case Code.Unimplemented:
      return new NotImplementedError(err.message);
    case Code.Unavailable:
      return new ServiceUnavailableError(err.message);
    case Code.DeadlineExceeded:
      return new TimeoutError(err.message);
    case Code.FailedPrecondition:
      return new PreconditionFailedError(err.message);
    case Code.Canceled:
      return new CancelledError(err.message);
    default:
      return new InternalServerError(err.message);
  }
}
