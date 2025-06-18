import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ResponseHandler {
  static success<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = 200
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      ...(message && { message }),
      ...(data && { data }),
    };
    res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = 400,
    error?: string
  ): void {
    const response: ApiResponse = {
      success: false,
      message,
      ...(error && { error }),
    };
    res.status(statusCode).json(response);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): void {
    const response: ApiResponse<T[]> = {
      success: true,
      ...(message && { message }),
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
    res.json(response);
  }
}