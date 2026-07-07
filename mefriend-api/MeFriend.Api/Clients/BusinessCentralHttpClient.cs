using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using MeFriend.Api.Models.Common;
using MeFriend.Api.Options;
using MeFriend.Api.Services;
using Microsoft.Extensions.Options;

namespace MeFriend.Api.Clients;

public sealed class BusinessCentralHttpClient : IBusinessCentralHttpClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IBusinessCentralAuthService _authService;
    private readonly IOptions<BusinessCentralOptions> _options;

    public BusinessCentralHttpClient(
        IHttpClientFactory httpClientFactory,
        IBusinessCentralAuthService authService,
        IOptions<BusinessCentralOptions> options)
    {
        _httpClientFactory = httpClientFactory;
        _authService = authService;
        _options = options;
    }

    public Task<TResponse?> GetAsync<TResponse>(
        string relativeOrAbsoluteUrl,
        CancellationToken cancellationToken)
    {
        return SendAsync<object, TResponse>(
            HttpMethod.Get,
            relativeOrAbsoluteUrl,
            payload: null,
            cancellationToken);
    }

    public Task<TResponse?> PostAsync<TRequest, TResponse>(
        string relativeOrAbsoluteUrl,
        TRequest payload,
        CancellationToken cancellationToken)
    {
        return SendAsync<TRequest, TResponse>(
            HttpMethod.Post,
            relativeOrAbsoluteUrl,
            payload,
            cancellationToken);
    }

    public Task<TResponse?> PutAsync<TRequest, TResponse>(
        string relativeOrAbsoluteUrl,
        TRequest payload,
        CancellationToken cancellationToken)
    {
        return SendAsync<TRequest, TResponse>(
            HttpMethod.Put,
            relativeOrAbsoluteUrl,
            payload,
            cancellationToken);
    }

    public Task<TResponse?> PatchAsync<TRequest, TResponse>(
        string relativeOrAbsoluteUrl,
        TRequest payload,
        CancellationToken cancellationToken)
    {
        return SendAsync<TRequest, TResponse>(
            HttpMethod.Patch,
            relativeOrAbsoluteUrl,
            payload,
            cancellationToken);
    }

    public async Task DeleteAsync(string relativeOrAbsoluteUrl, CancellationToken cancellationToken)
    {
        await SendAsync<object, object>(
            HttpMethod.Delete,
            relativeOrAbsoluteUrl,
            payload: null,
            cancellationToken);
    }

    private async Task<TResponse?> SendAsync<TRequest, TResponse>(
        HttpMethod method,
        string relativeOrAbsoluteUrl,
        TRequest? payload,
        CancellationToken cancellationToken)
    {
        var requestUri = BuildRequestUri(relativeOrAbsoluteUrl);
        var accessToken = await _authService.GetAccessTokenAsync(cancellationToken);

        using var request = new HttpRequestMessage(method, requestUri);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        if (payload is not null)
        {
            var json = JsonSerializer.Serialize(payload, JsonOptions);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        }

        var httpClient = _httpClientFactory.CreateClient(nameof(BusinessCentralHttpClient));
        using var response = await httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw CreateBusinessCentralException(response.StatusCode, responseBody);
        }

        if (string.IsNullOrWhiteSpace(responseBody))
        {
            return default;
        }

        return JsonSerializer.Deserialize<TResponse>(responseBody, JsonOptions);
    }

    private Uri BuildRequestUri(string relativeOrAbsoluteUrl)
    {
        if (Uri.TryCreate(relativeOrAbsoluteUrl, UriKind.Absolute, out var absoluteUri))
        {
            return absoluteUri;
        }

        var baseUrl = _options.Value.BaseUrl;
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            throw new InvalidOperationException(
                "Business Central BaseUrl is required when using relative API URLs.");
        }

        if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var baseUri))
        {
            throw new InvalidOperationException("Business Central BaseUrl must be an absolute URL.");
        }

        return new Uri(baseUri, relativeOrAbsoluteUrl);
    }

    private static BusinessCentralApiException CreateBusinessCentralException(
        HttpStatusCode statusCode,
        string responseBody)
    {
        var error = TryParseBusinessCentralError(responseBody);
        var message = error?.Message ?? "Business Central API request failed.";

        return new BusinessCentralApiException(statusCode, message, error?.Code);
    }

    private static BusinessCentralError? TryParseBusinessCentralError(string responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody))
        {
            return null;
        }

        try
        {
            var errorResponse = JsonSerializer.Deserialize<BusinessCentralErrorResponse>(
                responseBody,
                JsonOptions);

            return errorResponse?.Error;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private sealed class BusinessCentralErrorResponse
    {
        public BusinessCentralError? Error { get; init; }
    }

    private sealed class BusinessCentralError
    {
        public string? Code { get; init; }
        public string? Message { get; init; }
    }
}
