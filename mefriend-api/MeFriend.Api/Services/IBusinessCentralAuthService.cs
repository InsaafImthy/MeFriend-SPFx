namespace MeFriend.Api.Services;

public interface IBusinessCentralAuthService
{
    Task<string> GetAccessTokenAsync(CancellationToken cancellationToken);
}
