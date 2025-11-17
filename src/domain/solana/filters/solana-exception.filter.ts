import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';

export interface SolanaError {
    code: number;
    message: string;
    data?: any;
    retryable: boolean;
    category: 'network' | 'transaction' | 'account' | 'validation' | 'unknown';
}

@Catch()
export class SolanaExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(SolanaExceptionFilter.name);

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();

        // Check if it's a Solana-specific error
        const solanaError = this.parseSolanaError(exception);

        if (solanaError) {
            this.logger.error(
                `Solana Error [${solanaError.category}]: ${solanaError.message}`,
            );

            const httpStatus = this.mapSolanaErrorToHttpStatus(solanaError);

            response.status(httpStatus).json({
                statusCode: httpStatus,
                timestamp: new Date().toISOString(),
                path: request.url,
                error: {
                    type: 'SolanaError',
                    category: solanaError.category,
                    code: solanaError.code,
                    message: solanaError.message,
                    retryable: solanaError.retryable,
                    data: solanaError.data,
                },
            });
        } else {
            // Handle other exceptions normally
            const status =
                exception instanceof HttpException
                    ? exception.getStatus()
                    : HttpStatus.INTERNAL_SERVER_ERROR;

            // Enhanced logging with request details
            const requestDetails = {
                method: request.method,
                url: request.url,
                path: request.path,
                query: request.query,
                ip: request.ip,
                userAgent: request.headers['user-agent'],
                hasAuthHeader: !!request.headers.authorization,
                authHeaderPrefix:
                    request.headers.authorization?.substring(0, 20) || 'none',
            };

            this.logger.error(
                `Non-Solana Error: ${exception.message}`,
                JSON.stringify(requestDetails, null, 2),
            );

            response.status(status).json({
                statusCode: status,
                timestamp: new Date().toISOString(),
                path: request.url,
                method: request.method,
                message: exception.message || 'Internal server error',
            });
        }
    }

    private parseSolanaError(exception: any): SolanaError | null {
        // Check for Solana RPC errors
        if (exception?.code && typeof exception.code === 'number') {
            return {
                code: exception.code,
                message: exception.message || 'Unknown Solana RPC error',
                data: exception.data,
                retryable: this.isRetryableError(exception.code),
                category: this.categorizeError(exception.code),
            };
        }

        // Check for Solana web3.js errors
        if (exception?.message) {
            const message = exception.message.toLowerCase();

            if (message.includes('insufficient funds')) {
                return {
                    code: 1,
                    message: 'Insufficient funds for transaction',
                    retryable: false,
                    category: 'account',
                };
            }

            if (message.includes('blockhash not found')) {
                return {
                    code: 2,
                    message: 'Blockhash not found or expired',
                    retryable: true,
                    category: 'transaction',
                };
            }

            if (message.includes('transaction failed')) {
                return {
                    code: 3,
                    message: 'Transaction failed to confirm',
                    retryable: true,
                    category: 'transaction',
                };
            }

            if (message.includes('invalid public key')) {
                return {
                    code: 4,
                    message: 'Invalid Solana address format',
                    retryable: false,
                    category: 'validation',
                };
            }

            if (message.includes('connection') || message.includes('network')) {
                return {
                    code: 5,
                    message: 'Network connection error',
                    retryable: true,
                    category: 'network',
                };
            }
        }

        return null;
    }

    private isRetryableError(code: number): boolean {
        // Solana RPC error codes that are retryable
        const retryableCodes = [
            -32002, // Account not found
            -32003, // Invalid account
            -32004, // Invalid program
            -32005, // Invalid instruction
            -32006, // Invalid transaction
            -32007, // Invalid blockhash
            -32008, // Invalid commitment
            -32009, // Invalid signature
            -32010, // Invalid slot
            -32011, // Invalid transaction signature
            -32012, // Invalid transaction version
            -32013, // Invalid transaction message
            -32014, // Invalid transaction signature verification
            -32015, // Invalid transaction signature verification
            -32016, // Invalid transaction signature verification
            -32017, // Invalid transaction signature verification
            -32018, // Invalid transaction signature verification
            -32019, // Invalid transaction signature verification
            -32020, // Invalid transaction signature verification
        ];

        return retryableCodes.includes(code);
    }

    private categorizeError(code: number): SolanaError['category'] {
        if (code >= -32002 && code <= -32010) {
            return 'account';
        }
        if (code >= -32011 && code <= -32020) {
            return 'transaction';
        }
        if (code === -32603 || code === -32602) {
            return 'network';
        }
        return 'unknown';
    }

    private mapSolanaErrorToHttpStatus(error: SolanaError): HttpStatus {
        switch (error.category) {
            case 'validation':
                return HttpStatus.BAD_REQUEST;
            case 'account':
                return HttpStatus.NOT_FOUND;
            case 'transaction':
                return error.retryable
                    ? HttpStatus.SERVICE_UNAVAILABLE
                    : HttpStatus.BAD_REQUEST;
            case 'network':
                return HttpStatus.SERVICE_UNAVAILABLE;
            default:
                return HttpStatus.INTERNAL_SERVER_ERROR;
        }
    }
}
