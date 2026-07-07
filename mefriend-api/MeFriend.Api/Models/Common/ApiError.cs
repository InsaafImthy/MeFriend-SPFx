namespace MeFriend.Api.Models.Common;

public sealed class ApiError
{
    public string Code { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public string? Details { get; init; }
    public Dictionary<string, string[]>? ValidationErrors { get; init; }
    public string? TraceId { get; init; }

    public ApiError()
    {
    }

    public ApiError(string code, string message, string? details = null)
    {
        Code = code;
        Message = message;
        Details = details;
    }
}
