using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using MeFriend.Api.Options;
using Microsoft.Extensions.Options;

namespace MeFriend.Api.Services;

public sealed class BusinessCentralAuthService : IBusinessCentralAuthService
{
    private const string DefaultScope = "https://api.businesscentral.dynamics.com/.default";
    private static readonly TimeSpan ExpiryBuffer = TimeSpan.FromMinutes(5);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<BusinessCentralOptions> _options;
    private readonly SemaphoreSlim _tokenLock = new(1, 1);

    private string? _cachedAccessToken;
    private DateTimeOffset _cachedAccessTokenExpiresAt;

    public BusinessCentralAuthService(
        IHttpClientFactory httpClientFactory,
        IOptions<BusinessCentralOptions> options)
    {
        _httpClientFactory = httpClientFactory;
        _options = options;
    }

    public async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        var options = ValidateOptions(_options.Value);

        if (HasUsableCachedToken())
        {
            return _cachedAccessToken!;
        }

        await _tokenLock.WaitAsync(cancellationToken);
        try
        {
            if (HasUsableCachedToken())
            {
                return _cachedAccessToken!;
            }

            var tokenResponse = await RequestAccessTokenAsync(options, cancellationToken);
            _cachedAccessToken = tokenResponse.AccessToken;
            _cachedAccessTokenExpiresAt = DateTimeOffset.UtcNow.AddSeconds(tokenResponse.ExpiresIn);

            return _cachedAccessToken;
        }
        finally
        {
            _tokenLock.Release();
        }
    }

    private bool HasUsableCachedToken()
    {
        return !string.IsNullOrWhiteSpace(_cachedAccessToken)
            && _cachedAccessTokenExpiresAt > DateTimeOffset.UtcNow.Add(ExpiryBuffer);
    }

    private async Task<TokenResponse> RequestAccessTokenAsync(
        BusinessCentralOptions options,
        CancellationToken cancellationToken)
    {
        var authority = $"https://login.microsoftonline.com/{Uri.EscapeDataString(options.TenantId)}";
        var tokenEndpoint = $"{authority}/oauth2/v2.0/token";
        var scope = string.IsNullOrWhiteSpace(options.Scope) ? DefaultScope : options.Scope;

        using var request = new HttpRequestMessage(HttpMethod.Post, tokenEndpoint)
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = options.ClientId,
                ["client_secret"] = options.ClientSecret,
                ["grant_type"] = "client_credentials",
                ["scope"] = scope
            })
        };

        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var httpClient = _httpClientFactory.CreateClient(nameof(BusinessCentralAuthService));
        using var response = await httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Business Central OAuth token request failed with status {(int)response.StatusCode}.");
        }

        var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(
            responseBody,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

        if (tokenResponse is null || string.IsNullOrWhiteSpace(tokenResponse.AccessToken))
        {
            throw new InvalidOperationException("Business Central OAuth token response did not include an access token.");
        }

        if (tokenResponse.ExpiresIn <= 0)
        {
            throw new InvalidOperationException("Business Central OAuth token response did not include a valid expiry.");
        }

        return tokenResponse;
    }

    private static BusinessCentralOptions ValidateOptions(BusinessCentralOptions options)
    {
        var missingFields = new List<string>();

        if (string.IsNullOrWhiteSpace(options.TenantId))
        {
            missingFields.Add($"{BusinessCentralOptions.SectionName}:TenantId");
        }

        if (string.IsNullOrWhiteSpace(options.ClientId))
        {
            missingFields.Add($"{BusinessCentralOptions.SectionName}:ClientId");
        }

        if (string.IsNullOrWhiteSpace(options.ClientSecret))
        {
            missingFields.Add($"{BusinessCentralOptions.SectionName}:ClientSecret");
        }

        if (missingFields.Count > 0)
        {
            throw new InvalidOperationException(
                $"Business Central OAuth configuration is missing required value(s): {string.Join(", ", missingFields)}.");
        }

        return options;
    }

    private sealed class TokenResponse
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; init; } = string.Empty;

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; init; }
    }
}
