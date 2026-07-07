using MeFriend.Api.Models.Customers;

namespace MeFriend.Api.Mappers;

public static class CustomerMapper
{
    public static BusinessCentralCustomerCreatePayload ToBusinessCentralPayload(CustomerCreateRequest request)
    {
        var postingGroup = ResolvePostingGroup(request.Department);

        return new BusinessCentralCustomerCreatePayload
        {
            Name = request.CustomerName.Trim(),
            Name2 = request.CustomerCode.Trim(),
            Address = request.Address.Trim(),
            StateCode = request.StateCode.Trim(),
            CountryRegionCode = request.CountryCode.Trim(),
            City = request.City.Trim(),
            PostCode = request.PostCode.Trim(),
            LocationCode = request.LocationCode.Trim(),
            PANNo = request.PanNo.Trim(),
            GstRegistrationNo = request.GstNo.Trim(),
            DeviceId = string.Empty,
            RegionCode = request.CustomerCode.Trim(),
            Incode = string.Empty,
            GenPostingGroup = postingGroup,
            CustomerPostingGroup = postingGroup,
            GstCustomerType = string.IsNullOrWhiteSpace(request.GstNo) ? "unregistered" : "registered",
            ApplicationMethod = "Apply to Oldest",
            PaymentMethodCode = string.Empty,
            CustDimensions = new[]
            {
                new CustomerDimensionPayload
                {
                    DimensionCode = CustomerConstants.BranchDimensionCode,
                    DimensionValueCode = request.Branch.Trim().ToUpperInvariant()
                },
                new CustomerDimensionPayload
                {
                    DimensionCode = CustomerConstants.DepartmentDimensionCode,
                    DimensionValueCode = request.Department.Trim().ToUpperInvariant()
                },
                new CustomerDimensionPayload
                {
                    DimensionCode = CustomerConstants.ProductDimensionCode,
                    DimensionValueCode = CustomerConstants.DefaultProductDimensionValue
                }
            }
        };
    }

    private static string ResolvePostingGroup(string department)
    {
        var normalizedDepartment = department.Trim().ToUpperInvariant();

        // Posting-group values are isolated here until the Business Central contract confirms
        // whether B2C remains the default for both circulation and advertisement customers.
        return normalizedDepartment switch
        {
            "CIR" => "CIR-B2C",
            "ADVT" => "ADVT-B2C",
            _ => string.Empty
        };
    }
}
