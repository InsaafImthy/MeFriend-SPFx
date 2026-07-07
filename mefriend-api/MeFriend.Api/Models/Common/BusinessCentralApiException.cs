using System.Net;

namespace MeFriend.Api.Models.Common;

public sealed class BusinessCentralApiException : InvalidOperationException
{
    public BusinessCentralApiException(
        HttpStatusCode statusCode,
        string message,
        string? businessCentralErrorCode = null)
        : base(message)
    {
        StatusCode = statusCode;
        BusinessCentralErrorCode = businessCentralErrorCode;
    }

    public HttpStatusCode StatusCode { get; }
    public string? BusinessCentralErrorCode { get; }
}
