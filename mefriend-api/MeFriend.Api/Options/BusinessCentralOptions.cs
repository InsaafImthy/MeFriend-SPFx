namespace MeFriend.Api.Options;

public sealed class BusinessCentralOptions
{
    public const string SectionName = "BusinessCentral";

    public string TenantId { get; init; } = string.Empty;
    public string Environment { get; init; } = string.Empty;
    public string CompanyName { get; init; } = string.Empty;
    public string BaseUrl { get; init; } = string.Empty;
    public string ClientId { get; init; } = string.Empty;
    public string ClientSecret { get; init; } = string.Empty;
    public string Scope { get; init; } = string.Empty;
}
