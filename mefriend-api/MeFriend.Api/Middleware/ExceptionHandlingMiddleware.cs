using System.Net;
using MeFriend.Api.Models.Common;

namespace MeFriend.Api.Middleware;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IWebHostEnvironment _environment;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IWebHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (BusinessCentralApiException exception)
        {
            var traceId = context.TraceIdentifier;

            _logger.LogWarning(
                "Business Central request failed. StatusCode: {StatusCode}. BusinessCentralErrorCode: {BusinessCentralErrorCode}. TraceId: {TraceId}",
                (int)exception.StatusCode,
                exception.BusinessCentralErrorCode,
                traceId);

            context.Response.StatusCode = (int)MapStatusCode(exception.StatusCode);
            context.Response.ContentType = "application/json";

            var details = _environment.IsDevelopment()
                ? exception.BusinessCentralErrorCode
                : null;

            var response = ApiResponse<object>.FailureResponse(
                "BusinessCentralRequestFailed",
                "Business Central request failed.",
                details,
                traceId);

            await context.Response.WriteAsJsonAsync(response);
        }
        catch (Exception exception)
        {
            var traceId = context.TraceIdentifier;

            // Avoid logging exception payloads here because integration failures can contain tokens or secrets.
            _logger.LogError("Unhandled API exception. TraceId: {TraceId}", traceId);

            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            context.Response.ContentType = "application/json";

            var details = _environment.IsDevelopment() ? exception.Message : null;
            var response = ApiResponse<object>.FailureResponse(
                "UnhandledException",
                "An unexpected error occurred while processing the request.",
                details,
                traceId);

            await context.Response.WriteAsJsonAsync(response);
        }
    }

    private static HttpStatusCode MapStatusCode(HttpStatusCode statusCode)
    {
        return statusCode switch
        {
            HttpStatusCode.BadRequest => HttpStatusCode.BadRequest,
            HttpStatusCode.Unauthorized => HttpStatusCode.BadGateway,
            HttpStatusCode.Forbidden => HttpStatusCode.BadGateway,
            HttpStatusCode.NotFound => HttpStatusCode.NotFound,
            HttpStatusCode.TooManyRequests => HttpStatusCode.TooManyRequests,
            _ => HttpStatusCode.BadGateway
        };
    }
}
