using MeFriend.Api.Models.Common;
using MeFriend.Api.Models.Customers;

namespace MeFriend.Api.Services;

public interface IBusinessCentralCustomerService
{
    Task<ApiResponse<CustomerCreateResponse>> CreateAsync(CustomerCreateRequest request, CancellationToken cancellationToken);
}
