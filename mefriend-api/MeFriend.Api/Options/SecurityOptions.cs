namespace MeFriend.Api.Options;

public sealed class SecurityOptions
{
    public const string SectionName = "Security";

    public string[] AllowedCorsOrigins { get; init; } = Array.Empty<string>();
}
