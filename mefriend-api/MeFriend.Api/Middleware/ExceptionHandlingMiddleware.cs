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
}
