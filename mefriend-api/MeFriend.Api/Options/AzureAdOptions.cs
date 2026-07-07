namespace MeFriend.Api.Options;

public sealed class AzureAdOptions
{
    public const string SectionName = "AzureAd";

    public string Instance { get; init; } = string.Empty;
    public string TenantId { get; init; } = string.Empty;
    public string ClientId { get; init; } = string.Empty;
    public string Audience { get; init; } = string.Empty;
}
