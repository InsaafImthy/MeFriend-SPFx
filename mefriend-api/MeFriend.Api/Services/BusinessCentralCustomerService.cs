using MeFriend.Api.Models.Common;
using MeFriend.Api.Models.Customers;

namespace MeFriend.Api.Services;

public sealed class BusinessCentralCustomerService : IBusinessCentralCustomerService
{
    public Task<ApiResponse<CustomerCreateResponse>> CreateAsync(
        CustomerCreateRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(ApiResponse<CustomerCreateResponse>.Fail(
            "CustomerCreateNotImplemented",
            "Customer creation mapping exists, but Business Central submission is not implemented yet."));
    }
}
