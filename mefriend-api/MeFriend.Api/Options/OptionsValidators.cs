namespace MeFriend.Api.Options;

public static class BusinessCentralOptionsValidator
{
    public const string FailureMessage = "Business Central configuration is incomplete.";

    public static bool Validate(BusinessCentralOptions options)
    {
        return HasValue(options.TenantId)
            && HasValue(options.Environment)
            && HasValue(options.CompanyName)
            && HasAbsoluteUrl(options.BaseUrl)
            && HasValue(options.ClientId)
            && HasValue(options.ClientSecret);
    }

    internal static bool HasValue(string? value)
    {
        return !string.IsNullOrWhiteSpace(value)
            && !value.Contains("placeholder", StringComparison.OrdinalIgnoreCase)
            && !value.Contains("your-", StringComparison.OrdinalIgnoreCase)
            && !value.StartsWith("__", StringComparison.Ordinal);
    }

    private static bool HasAbsoluteUrl(string? value)
    {
        return HasValue(value) && Uri.TryCreate(value, UriKind.Absolute, out _);
    }
}

public static class AzureAdOptionsValidator
{
    public const string FailureMessage = "Azure AD configuration is incomplete.";

    public static bool Validate(AzureAdOptions options)
    {
        return HasValidInstance(options.Instance)
            && BusinessCentralOptionsValidator.HasValue(options.TenantId)
            && BusinessCentralOptionsValidator.HasValue(options.ClientId)
            && BusinessCentralOptionsValidator.HasValue(options.GetAudience());
    }

    public static string BuildAuthority(AzureAdOptions options)
    {
        var instance = string.IsNullOrWhiteSpace(options.Instance)
            ? "https://login.microsoftonline.com/"
            : options.Instance.Trim();

        if (!instance.EndsWith("/", StringComparison.Ordinal))
        {
            instance += "/";
        }

        return $"{instance}{Uri.EscapeDataString(options.TenantId)}/v2.0";
    }

    private static bool HasValidInstance(string? value)
    {
        return BusinessCentralOptionsValidator.HasValue(value)
            && Uri.TryCreate(value, UriKind.Absolute, out _);
    }
}

public static class SecurityOptionsValidator
{
    public const string FailureMessage = "At least one explicit SharePoint CORS origin is required.";

    public static bool Validate(SecurityOptions options)
    {
        return options.AllowedCorsOrigins.Length > 0
            && options.AllowedCorsOrigins.All(IsAllowedOrigin);
    }

    private static bool IsAllowedOrigin(string? origin)
    {
        if (!BusinessCentralOptionsValidator.HasValue(origin)
            || origin!.Contains("*", StringComparison.Ordinal))
        {
            return false;
        }

        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
        {
            return false;
        }

        return uri.Scheme == Uri.UriSchemeHttps
            && uri.Host.EndsWith(".sharepoint.com", StringComparison.OrdinalIgnoreCase);
    }
}
