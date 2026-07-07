namespace MeFriend.Api.Models.Common;

public sealed class ApiResponse<T>
{
    public bool Success { get; init; }
    public string Message { get; init; } = string.Empty;
    public T? Data { get; init; }
    public ApiError? Error { get; init; }

    public static ApiResponse<T> SuccessResponse(T data, string message = "Request completed successfully.")
    {
        return new ApiResponse<T>
        {
            Success = true,
            Message = message,
            Data = data
        };
    }

    public static ApiResponse<T> FailureResponse(string message, ApiError error)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Message = message,
            Error = error
        };
    }

    public static ApiResponse<T> FailureResponse(
        string code,
        string message,
        string? details = null,
        string? traceId = null,
        Dictionary<string, string[]>? validationErrors = null)
    {
        return FailureResponse(
            message,
            new ApiError
            {
                Code = code,
                Message = message,
                Details = details,
                TraceId = traceId,
                ValidationErrors = validationErrors
            });
    }

    public static ApiResponse<T> Ok(T data)
    {
        return SuccessResponse(data);
    }

    public static ApiResponse<T> Fail(string code, string message, string? details = null)
    {
        return FailureResponse(code, message, details);
    }
}
