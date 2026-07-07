using MeFriend.Api.Clients;
using MeFriend.Api.Middleware;
using MeFriend.Api.Options;
using MeFriend.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();
builder.Services.AddHttpClient();
builder.Services.AddHttpClient(nameof(BusinessCentralAuthService));
builder.Services.AddHttpClient(nameof(BusinessCentralHttpClient));

builder.Services.Configure<BusinessCentralOptions>(
    builder.Configuration.GetSection(BusinessCentralOptions.SectionName));
builder.Services.Configure<AzureAdOptions>(
    builder.Configuration.GetSection(AzureAdOptions.SectionName));

var allowedOrigins = builder.Configuration
    .GetSection("Security:AllowedCorsOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("SharePointOrigins", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Microsoft Entra ID authentication is intentionally a placeholder here.
// Add JwtBearer or Microsoft.Identity.Web configuration when tenant/app values are finalized.
builder.Services.AddAuthentication();
builder.Services.AddAuthorization();

builder.Services.AddScoped<IBusinessCentralHttpClient, BusinessCentralHttpClient>();
builder.Services.AddSingleton<IBusinessCentralAuthService, BusinessCentralAuthService>();
builder.Services.AddScoped<IBusinessCentralCustomerService, BusinessCentralCustomerService>();
builder.Services.AddScoped<IBusinessCentralEventService, BusinessCentralEventService>();
builder.Services.AddScoped<IBusinessCentralSalespersonService, BusinessCentralSalespersonService>();
builder.Services.AddScoped<IBusinessCentralInvoiceService, BusinessCentralInvoiceService>();
builder.Services.AddScoped<IBusinessCentralSalesOrderService, BusinessCentralSalesOrderService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseHttpsRedirection();
app.UseCors("SharePointOrigins");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
